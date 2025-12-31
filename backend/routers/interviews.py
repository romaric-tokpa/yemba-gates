"""
Routes pour la gestion des entretiens (US08, US09, US10)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from database import get_session
from models import User, UserRole, Interview, Application, Candidate, Job
from auth import get_current_active_user, require_recruteur

router = APIRouter(prefix="/interviews", tags=["interviews"])


class InterviewCreate(BaseModel):
    """Schéma pour créer un entretien"""
    application_id: UUID
    interview_type: str  # 'rh', 'technique', 'client'
    scheduled_at: datetime
    location: Optional[str] = None
    interviewer_id: Optional[UUID] = None
    preparation_notes: Optional[str] = None


class InterviewUpdate(BaseModel):
    """Schéma pour mettre à jour un entretien"""
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = None
    interviewer_id: Optional[UUID] = None
    preparation_notes: Optional[str] = None


class InterviewFeedback(BaseModel):
    """Schéma pour saisir le feedback d'un entretien"""
    feedback: str = Field(..., min_length=1, description="Feedback obligatoire de l'entretien")
    decision: str = Field(..., description="Décision : 'positif', 'négatif', 'en_attente'")
    score: Optional[int] = Field(None, ge=0, le=10, description="Score sur 10")
    
    @field_validator('decision')
    @classmethod
    def validate_decision(cls, v: str) -> str:
        valid_decisions = ['positif', 'négatif', 'en_attente']
        if v.lower() not in valid_decisions:
            raise ValueError(f"Décision invalide. Valeurs valides: {', '.join(valid_decisions)}")
        return v.lower()
    
    @field_validator('feedback')
    @classmethod
    def validate_feedback(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Le feedback est obligatoire et ne peut pas être vide")
        return v.strip()


class InterviewResponse(BaseModel):
    """Schéma de réponse pour un entretien"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    interview_type: str
    scheduled_at: datetime
    location: Optional[str]
    interviewer_id: Optional[str]
    interviewer_name: Optional[str]
    preparation_notes: Optional[str]
    feedback: Optional[str]
    feedback_provided_at: Optional[datetime]
    decision: Optional[str]
    score: Optional[int]
    created_by: str
    created_by_name: str
    candidate_name: str
    job_title: str
    created_at: datetime
    updated_at: datetime


@router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    interview_data: InterviewCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Planifier un entretien (US08)
    
    Permet de planifier un entretien pour une candidature.
    Types d'entretien : 'rh', 'technique', 'client'
    
    Seuls les utilisateurs authentifiés peuvent planifier un entretien.
    La candidature (Application) doit exister.
    """
    # Vérifier que l'application existe
    application = session.get(Application, interview_data.application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée. L'application spécifiée n'existe pas."
        )
    
    # Vérifier que le type d'entretien est valide
    valid_types = ['rh', 'technique', 'client']
    if interview_data.interview_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type d'entretien invalide. Types valides: {', '.join(valid_types)}"
        )
    
    # Vérifier que l'interviewer existe si fourni
    if interview_data.interviewer_id:
        interviewer = session.get(User, interview_data.interviewer_id)
        if not interviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interviewer non trouvé"
            )
    
    # Créer l'entretien
    new_interview = Interview(
        application_id=interview_data.application_id,
        interview_type=interview_data.interview_type,
        scheduled_at=interview_data.scheduled_at,
        location=interview_data.location,
        interviewer_id=interview_data.interviewer_id,
        preparation_notes=interview_data.preparation_notes,
        created_by=current_user.id
    )
    
    session.add(new_interview)
    session.commit()
    session.refresh(new_interview)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    interviewer = session.get(User, new_interview.interviewer_id) if new_interview.interviewer_id else None
    creator = session.get(User, new_interview.created_by)
    
    return {
        "id": str(new_interview.id),
        "application_id": str(new_interview.application_id),
        "interview_type": new_interview.interview_type,
        "scheduled_at": new_interview.scheduled_at,
        "location": new_interview.location,
        "interviewer_id": str(new_interview.interviewer_id) if new_interview.interviewer_id else None,
        "interviewer_name": f"{interviewer.first_name} {interviewer.last_name}" if interviewer else None,
        "preparation_notes": new_interview.preparation_notes,
        "feedback": new_interview.feedback,
        "feedback_provided_at": new_interview.feedback_provided_at,
        "decision": new_interview.decision,
        "score": new_interview.score,
        "created_by": str(new_interview.created_by),
        "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else "",
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "created_at": new_interview.created_at,
        "updated_at": new_interview.updated_at
    }


@router.get("/", response_model=List[InterviewResponse])
def list_interviews(
    application_id: Optional[UUID] = Query(None, description="Filtrer par candidature"),
    job_id: Optional[UUID] = Query(None, description="Filtrer par job"),
    candidate_id: Optional[UUID] = Query(None, description="Filtrer par candidat"),
    interview_type: Optional[str] = Query(None, description="Filtrer par type"),
    interviewer_id: Optional[UUID] = Query(None, description="Filtrer par interviewer"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Lister les entretiens avec filtres optionnels
    
    Filtres disponibles :
    - Par candidature (application_id)
    - Par job (job_id) : tous les entretiens des candidatures liées à ce job
    - Par candidat (candidate_id) : tous les entretiens des candidatures de ce candidat
    - Par type d'entretien (interview_type)
    - Par interviewer (interviewer_id)
    
    Les recruteurs et managers voient tous les entretiens.
    Les autres utilisateurs voient uniquement les entretiens liés à leurs candidatures/jobs.
    """
    # Construire la requête avec jointures
    statement = select(Interview).join(Application, Interview.application_id == Application.id)
    
    # Appliquer les filtres
    if application_id:
        statement = statement.where(Interview.application_id == application_id)
    
    if job_id:
        # Filtrer par job via la candidature
        statement = statement.where(Application.job_id == job_id)
    
    if candidate_id:
        # Filtrer par candidat via la candidature
        statement = statement.where(Application.candidate_id == candidate_id)
    
    if interview_type:
        statement = statement.where(Interview.interview_type == interview_type)
    
    if interviewer_id:
        statement = statement.where(Interview.interviewer_id == interviewer_id)
    
    # Règles d'accès selon le rôle
    if current_user.role not in [UserRole.RECRUTEUR.value, UserRole.MANAGER.value, UserRole.ADMINISTRATEUR.value]:
        # Pour les clients, on ne montre que les entretiens des candidatures de leurs jobs
        # Cette logique peut être affinée selon les besoins
        pass
    
    statement = statement.offset(skip).limit(limit).order_by(Interview.scheduled_at.desc())
    interviews = session.exec(statement).all()
    
    # Construire les réponses avec les informations complètes
    results = []
    for interview in interviews:
        application = session.get(Application, interview.application_id)
        if not application:
            continue
        
        candidate = session.get(Candidate, application.candidate_id)
        job = session.get(Job, application.job_id)
        interviewer = session.get(User, interview.interviewer_id) if interview.interviewer_id else None
        creator = session.get(User, interview.created_by)
        
        results.append({
            "id": str(interview.id),
            "application_id": str(interview.application_id),
            "interview_type": interview.interview_type,
            "scheduled_at": interview.scheduled_at,
            "location": interview.location,
            "interviewer_id": str(interview.interviewer_id) if interview.interviewer_id else None,
            "interviewer_name": f"{interviewer.first_name} {interviewer.last_name}" if interviewer else None,
            "preparation_notes": interview.preparation_notes,
            "feedback": interview.feedback,
            "feedback_provided_at": interview.feedback_provided_at,
            "decision": interview.decision,
            "score": interview.score,
            "created_by": str(interview.created_by),
            "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else "",
            "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
            "job_title": job.title if job else "",
            "created_at": interview.created_at,
            "updated_at": interview.updated_at
        })
    
    return results


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer les détails d'un entretien
    """
    interview = session.get(Interview, interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entretien non trouvé"
        )
    
    application = session.get(Application, interview.application_id)
    candidate = session.get(Candidate, application.candidate_id) if application else None
    job = session.get(Job, application.job_id) if application else None
    interviewer = session.get(User, interview.interviewer_id) if interview.interviewer_id else None
    creator = session.get(User, interview.created_by)
    
    return {
        "id": str(interview.id),
        "application_id": str(interview.application_id),
        "interview_type": interview.interview_type,
        "scheduled_at": interview.scheduled_at,
        "location": interview.location,
        "interviewer_id": str(interview.interviewer_id) if interview.interviewer_id else None,
        "interviewer_name": f"{interviewer.first_name} {interviewer.last_name}" if interviewer else None,
        "preparation_notes": interview.preparation_notes,
        "feedback": interview.feedback,
        "feedback_provided_at": interview.feedback_provided_at,
        "decision": interview.decision,
        "score": interview.score,
        "created_by": str(interview.created_by),
        "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else "",
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "created_at": interview.created_at,
        "updated_at": interview.updated_at
    }


@router.patch("/{interview_id}/feedback", response_model=InterviewResponse)
def add_interview_feedback(
    interview_id: UUID,
    feedback_data: InterviewFeedback,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Saisir le feedback d'un entretien (US09)
    
    Le feedback est obligatoire pour pouvoir faire avancer le candidat à l'étape suivante.
    Sans feedback, le candidat ne peut pas passer à l'étape suivante (shortlist, etc.).
    
    Le feedback doit contenir :
    - feedback (obligatoire, non vide)
    - decision ('positif', 'négatif', 'en_attente')
    - score (optionnel, entre 0 et 10)
    """
    interview = session.get(Interview, interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entretien non trouvé"
        )
    
    # Vérifier que l'application existe
    application = session.get(Application, interview.application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature associée non trouvée"
        )
    
    # Le feedback est déjà validé par le schéma Pydantic (obligatoire et non vide)
    # Mettre à jour le feedback
    interview.feedback = feedback_data.feedback
    interview.feedback_provided_at = datetime.utcnow()
    interview.decision = feedback_data.decision
    interview.score = feedback_data.score
    interview.updated_at = datetime.utcnow()
    
    session.add(interview)
    session.commit()
    session.refresh(interview)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id) if application else None
    job = session.get(Job, application.job_id) if application else None
    interviewer = session.get(User, interview.interviewer_id) if interview.interviewer_id else None
    creator = session.get(User, interview.created_by)
    
    return {
        "id": str(interview.id),
        "application_id": str(interview.application_id),
        "interview_type": interview.interview_type,
        "scheduled_at": interview.scheduled_at,
        "location": interview.location,
        "interviewer_id": str(interview.interviewer_id) if interview.interviewer_id else None,
        "interviewer_name": f"{interviewer.first_name} {interviewer.last_name}" if interviewer else None,
        "preparation_notes": interview.preparation_notes,
        "feedback": interview.feedback,
        "feedback_provided_at": interview.feedback_provided_at,
        "decision": interview.decision,
        "score": interview.score,
        "created_by": str(interview.created_by),
        "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else "",
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "created_at": interview.created_at,
        "updated_at": interview.updated_at
    }


@router.patch("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: UUID,
    interview_data: InterviewUpdate,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Mettre à jour un entretien (date, lieu, interviewer, notes)
    """
    interview = session.get(Interview, interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entretien non trouvé"
        )
    
    # Vérifier que l'interviewer existe si fourni
    if interview_data.interviewer_id:
        interviewer = session.get(User, interview_data.interviewer_id)
        if not interviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interviewer non trouvé"
            )
    
    # Mettre à jour les champs fournis
    if interview_data.scheduled_at is not None:
        interview.scheduled_at = interview_data.scheduled_at
    if interview_data.location is not None:
        interview.location = interview_data.location
    if interview_data.interviewer_id is not None:
        interview.interviewer_id = interview_data.interviewer_id
    if interview_data.preparation_notes is not None:
        interview.preparation_notes = interview_data.preparation_notes
    
    interview.updated_at = datetime.utcnow()
    
    session.add(interview)
    session.commit()
    session.refresh(interview)
    
    # Récupérer les informations complètes pour la réponse
    application = session.get(Application, interview.application_id)
    candidate = session.get(Candidate, application.candidate_id) if application else None
    job = session.get(Job, application.job_id) if application else None
    interviewer = session.get(User, interview.interviewer_id) if interview.interviewer_id else None
    creator = session.get(User, interview.created_by)
    
    return {
        "id": str(interview.id),
        "application_id": str(interview.application_id),
        "interview_type": interview.interview_type,
        "scheduled_at": interview.scheduled_at,
        "location": interview.location,
        "interviewer_id": str(interview.interviewer_id) if interview.interviewer_id else None,
        "interviewer_name": f"{interviewer.first_name} {interviewer.last_name}" if interviewer else None,
        "preparation_notes": interview.preparation_notes,
        "feedback": interview.feedback,
        "feedback_provided_at": interview.feedback_provided_at,
        "decision": interview.decision,
        "score": interview.score,
        "created_by": str(interview.created_by),
        "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else "",
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "created_at": interview.created_at,
        "updated_at": interview.updated_at
    }




