"""
Routes pour la gestion des demandes d'entretien client avec disponibilités
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
import json

from database import get_session
from models import User, UserRole, ClientInterviewRequest, Application, Candidate, Job, Interview
from auth import get_current_active_user

router = APIRouter(prefix="/client-interview-requests", tags=["client-interview-requests"])


class AvailabilitySlot(BaseModel):
    """Créneau de disponibilité"""
    date: str  # Format: YYYY-MM-DD
    start_time: str  # Format: HH:MM
    end_time: str  # Format: HH:MM


class ClientInterviewRequestCreate(BaseModel):
    """Schéma pour créer une demande d'entretien client"""
    application_id: UUID
    availability_slots: List[AvailabilitySlot]
    notes: Optional[str] = None


class ClientInterviewRequestResponse(BaseModel):
    """Schéma de réponse pour une demande d'entretien client"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    client_id: str
    client_name: str
    availability_slots: List[dict]
    notes: Optional[str]
    status: str
    scheduled_interview_id: Optional[str]
    candidate_name: str
    job_title: str
    job_id: str
    created_at: datetime
    updated_at: datetime


@router.post("/", response_model=ClientInterviewRequestResponse, status_code=status.HTTP_201_CREATED)
def create_client_interview_request(
    request_data: ClientInterviewRequestCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Créer une demande d'entretien client avec disponibilités
    
    Seuls les clients peuvent créer une demande d'entretien.
    """
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    if user_role != UserRole.CLIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les clients peuvent créer une demande d'entretien"
        )
    
    # Vérifier que l'application existe
    application = session.get(Application, request_data.application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Vérifier que le client est le créateur du job
    job = session.get(Job, application.job_id)
    if not job or job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez créer une demande d'entretien que pour vos propres besoins"
        )
    
    # Vérifier qu'il n'y a pas déjà une demande en attente pour cette application
    existing_request = session.exec(
        select(ClientInterviewRequest)
        .where(ClientInterviewRequest.application_id == request_data.application_id)
        .where(ClientInterviewRequest.status == "pending")
    ).first()
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une demande d'entretien est déjà en attente pour ce candidat"
        )
    
    # Convertir les créneaux en JSON
    availability_json = json.dumps([slot.model_dump() for slot in request_data.availability_slots])
    
    # Créer la demande
    new_request = ClientInterviewRequest(
        application_id=request_data.application_id,
        client_id=current_user.id,
        availability_slots=availability_json,
        notes=request_data.notes,
        status="pending"
    )
    
    session.add(new_request)
    session.commit()
    session.refresh(new_request)
    
    # Construire la réponse
    candidate = session.get(Candidate, application.candidate_id)
    return build_request_response(new_request, session)


@router.get("/", response_model=List[ClientInterviewRequestResponse])
def list_client_interview_requests(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
    status_filter: Optional[str] = None
):
    """
    Lister les demandes d'entretien client
    
    - Clients : voient leurs propres demandes
    - Recruteurs/Managers : voient toutes les demandes pour leurs jobs
    """
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    
    if user_role == UserRole.CLIENT.value:
        # Clients : leurs propres demandes
        query = select(ClientInterviewRequest).where(ClientInterviewRequest.client_id == current_user.id)
    elif user_role in [UserRole.RECRUTEUR.value, UserRole.MANAGER.value]:
        # Recruteurs/Managers : demandes pour leurs jobs
        if user_role == UserRole.RECRUTEUR.value:
            # Jobs créés par le recruteur
            jobs_query = select(Job.id).where(Job.created_by == current_user.id)
        else:
            # Managers : tous les jobs
            jobs_query = select(Job.id)
        
        applications_query = select(Application.id).where(Application.job_id.in_(jobs_query))
        query = select(ClientInterviewRequest).where(
            ClientInterviewRequest.application_id.in_(applications_query)
        )
    else:
        # Administrateurs : toutes les demandes
        query = select(ClientInterviewRequest)
    
    if status_filter:
        query = query.where(ClientInterviewRequest.status == status_filter)
    
    requests = session.exec(query).all()
    
    return [build_request_response(req, session) for req in requests]


@router.get("/{request_id}", response_model=ClientInterviewRequestResponse)
def get_client_interview_request(
    request_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Récupérer une demande d'entretien client spécifique"""
    request = session.get(ClientInterviewRequest, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande d'entretien non trouvée"
        )
    
    # Vérifier les permissions
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    if user_role == UserRole.CLIENT.value and request.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cette demande"
        )
    
    return build_request_response(request, session)


class ScheduleInterviewRequest(BaseModel):
    """Schéma pour programmer un entretien"""
    interview_id: UUID


@router.patch("/{request_id}/schedule", response_model=ClientInterviewRequestResponse)
def schedule_client_interview(
    request_id: UUID,
    schedule_data: ScheduleInterviewRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Programmer un entretien client à partir d'une demande
    
    Les recruteurs et managers peuvent programmer l'entretien.
    """
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    if user_role not in [UserRole.RECRUTEUR.value, UserRole.MANAGER.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les recruteurs et managers peuvent programmer un entretien"
        )
    
    request = session.get(ClientInterviewRequest, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande d'entretien non trouvée"
        )
    
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette demande n'est plus en attente"
        )
    
    # Vérifier que l'entretien existe et est de type 'client'
    interview = session.get(Interview, schedule_data.interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entretien non trouvé"
        )
    
    if interview.interview_type != "client":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'entretien doit être de type 'client'"
        )
    
    if interview.application_id != request.application_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'entretien ne correspond pas à la demande"
        )
    
    # Mettre à jour la demande
    request.status = "scheduled"
    request.scheduled_interview_id = schedule_data.interview_id
    request.updated_at = datetime.utcnow()
    
    session.add(request)
    session.commit()
    session.refresh(request)
    
    return build_request_response(request, session)


def build_request_response(request: ClientInterviewRequest, session: Session) -> dict:
    """Helper pour construire une réponse ClientInterviewRequestResponse"""
    application = session.get(Application, request.application_id)
    candidate = session.get(Candidate, application.candidate_id) if application else None
    job = session.get(Job, application.job_id) if application else None
    client = session.get(User, request.client_id)
    
    # Parser les créneaux de disponibilité
    try:
        availability_slots = json.loads(request.availability_slots)
    except:
        availability_slots = []
    
    return {
        "id": str(request.id),
        "application_id": str(request.application_id),
        "client_id": str(request.client_id),
        "client_name": f"{client.first_name} {client.last_name}" if client else "",
        "availability_slots": availability_slots,
        "notes": request.notes,
        "status": request.status,
        "scheduled_interview_id": str(request.scheduled_interview_id) if request.scheduled_interview_id else None,
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "job_id": str(job.id) if job else "",
        "created_at": request.created_at,
        "updated_at": request.updated_at
    }

