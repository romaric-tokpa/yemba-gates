"""
Routes pour la gestion des applications (attribution de candidats à des jobs)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from database_tenant import get_session
from models import Application, Candidate, Job, User
from auth import get_current_active_user, require_recruteur

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplicationCreate(BaseModel):
    """Schéma pour créer une application (attribuer un candidat à un job)"""
    candidate_id: UUID
    job_id: UUID
    status: Optional[str] = "sourcé"


class ApplicationResponse(BaseModel):
    """Schéma de réponse pour une application"""
    id: UUID
    candidate_id: UUID
    candidate_name: str
    candidate_email: Optional[str]
    candidate_profile_title: Optional[str]
    candidate_years_of_experience: Optional[int]
    candidate_photo_url: Optional[str]
    job_id: UUID
    job_title: str
    status: str
    is_in_shortlist: bool
    created_by: UUID
    created_by_name: str
    client_validated: Optional[bool] = None
    client_feedback: Optional[str] = None
    client_validated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    application_data: ApplicationCreate,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Créer une application (attribuer un candidat à un job)
    
    Permet à un recruteur d'attribuer un candidat à un besoin de recrutement.
    """
    # Vérifier que le candidat existe
    candidate = session.get(Candidate, application_data.candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )
    
    # Vérifier que le job existe
    job = session.get(Job, application_data.job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Vérifier si une application existe déjà pour ce candidat et ce job
    existing_application = session.exec(
        select(Application).where(
            Application.candidate_id == application_data.candidate_id,
            Application.job_id == application_data.job_id
        )
    ).first()
    
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce candidat est déjà attribué à ce besoin"
        )
    
    # Créer l'application
    new_application = Application(
        candidate_id=application_data.candidate_id,
        job_id=application_data.job_id,
        created_by=current_user.id,
        status=application_data.status
    )
    
    session.add(new_application)
    session.commit()
    session.refresh(new_application)
    
    # Récupérer les informations complètes pour la réponse
    creator = session.get(User, new_application.created_by)
    
    return ApplicationResponse(
        id=new_application.id,
        candidate_id=new_application.candidate_id,
        candidate_name=f"{candidate.first_name} {candidate.last_name}",
        candidate_email=candidate.email,
        candidate_profile_title=candidate.profile_title,
        candidate_years_of_experience=candidate.years_of_experience,
        candidate_photo_url=candidate.profile_picture_url,
        job_id=new_application.job_id,
        job_title=job.title,
        status=new_application.status,
        is_in_shortlist=new_application.is_in_shortlist,
        created_by=new_application.created_by,
        created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "",
        client_validated=new_application.client_validated,
        client_feedback=new_application.client_feedback,
        client_validated_at=new_application.client_validated_at,
        created_at=new_application.created_at,
        updated_at=new_application.updated_at
    )


@router.get("/job/{job_id}", response_model=List[ApplicationResponse])
def get_job_applications(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer toutes les applications (candidats) pour un job donné
    """
    # Vérifier que le job existe
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Récupérer toutes les applications pour ce job
    statement = select(Application).where(Application.job_id == job_id)
    applications = session.exec(statement).all()
    
    result = []
    for application in applications:
        candidate = session.get(Candidate, application.candidate_id)
        creator = session.get(User, application.created_by)
        
        result.append(ApplicationResponse(
            id=application.id,
            candidate_id=application.candidate_id,
            candidate_name=f"{candidate.first_name} {candidate.last_name}" if candidate else "",
            candidate_email=candidate.email if candidate else None,
            candidate_profile_title=candidate.profile_title if candidate else None,
            candidate_years_of_experience=candidate.years_of_experience if candidate else None,
            candidate_photo_url=candidate.profile_picture_url if candidate else None,
            job_id=application.job_id,
            job_title=job.title,
            status=application.status,
            is_in_shortlist=application.is_in_shortlist,
            created_by=application.created_by,
            created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "",
            client_validated=application.client_validated,
            client_feedback=application.client_feedback,
            client_validated_at=application.client_validated_at,
            created_at=application.created_at,
            updated_at=application.updated_at
        ))
    
    return result


@router.get("/job/{job_id}/shortlist", response_model=List[ApplicationResponse])
def get_job_shortlist(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer la shortlist (candidats en shortlist) pour un job donné
    """
    # Vérifier que le job existe
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Récupérer toutes les applications en shortlist pour ce job
    statement = select(Application).where(
        Application.job_id == job_id,
        Application.is_in_shortlist == True
    )
    applications = session.exec(statement).all()
    
    result = []
    for application in applications:
        candidate = session.get(Candidate, application.candidate_id)
        creator = session.get(User, application.created_by)
        
        result.append(ApplicationResponse(
            id=application.id,
            candidate_id=application.candidate_id,
            candidate_name=f"{candidate.first_name} {candidate.last_name}" if candidate else "",
            candidate_email=candidate.email if candidate else None,
            candidate_profile_title=candidate.profile_title if candidate else None,
            candidate_years_of_experience=candidate.years_of_experience if candidate else None,
            candidate_photo_url=candidate.profile_picture_url if candidate else None,
            job_id=application.job_id,
            job_title=job.title,
            status=application.status,
            is_in_shortlist=application.is_in_shortlist,
            created_by=application.created_by,
            created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "",
            client_validated=application.client_validated,
            client_feedback=application.client_feedback,
            client_validated_at=application.client_validated_at,
            created_at=application.created_at,
            updated_at=application.updated_at
        ))
    
    return result


@router.get("/candidate/{candidate_id}", response_model=List[ApplicationResponse])
def get_candidate_applications(
    candidate_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer toutes les applications (candidatures) pour un candidat donné
    """
    # Vérifier que le candidat existe
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )
    
    # Récupérer toutes les applications pour ce candidat
    statement = select(Application).where(Application.candidate_id == candidate_id)
    applications = session.exec(statement).all()
    
    result = []
    for application in applications:
        job = session.get(Job, application.job_id)
        creator = session.get(User, application.created_by)
        
        result.append(ApplicationResponse(
            id=application.id,
            candidate_id=application.candidate_id,
            candidate_name=f"{candidate.first_name} {candidate.last_name}",
            candidate_email=candidate.email,
            candidate_profile_title=candidate.profile_title,
            candidate_years_of_experience=candidate.years_of_experience,
            candidate_photo_url=candidate.profile_picture_url,
            job_id=application.job_id,
            job_title=job.title if job else "",
            status=application.status,
            is_in_shortlist=application.is_in_shortlist,
            created_by=application.created_by,
            created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "",
            client_validated=application.client_validated,
            client_feedback=application.client_feedback,
            client_validated_at=application.client_validated_at,
            created_at=application.created_at,
            updated_at=application.updated_at
        ))
    
    return result


@router.patch("/{application_id}/toggle-shortlist", response_model=ApplicationResponse)
def toggle_shortlist(
    application_id: UUID,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Basculer le statut de shortlist d'un candidat (ajouter si absent, retirer si présent)
    """
    # Récupérer l'application
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Basculer le statut de shortlist (toggle)
    application.is_in_shortlist = not application.is_in_shortlist
    if application.is_in_shortlist:
        application.status = "shortlist"
    else:
        # Si retiré de la shortlist, on peut remettre au statut précédent ou "sourcé"
        if application.status == "shortlist":
            application.status = "sourcé"
    
    application.updated_at = datetime.utcnow()
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    creator = session.get(User, application.created_by)
    
    return ApplicationResponse(
        id=application.id,
        candidate_id=application.candidate_id,
        candidate_name=f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        candidate_email=candidate.email if candidate else None,
        candidate_profile_title=candidate.profile_title if candidate else None,
        candidate_years_of_experience=candidate.years_of_experience if candidate else None,
        candidate_photo_url=candidate.profile_picture_url if candidate else None,
        job_id=application.job_id,
        job_title=job.title if job else "",
        status=application.status,
        is_in_shortlist=application.is_in_shortlist,
        created_by=application.created_by,
        created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "",
        client_validated=application.client_validated,
        client_feedback=application.client_feedback,
        client_validated_at=application.client_validated_at,
        created_at=application.created_at,
        updated_at=application.updated_at
    )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: UUID,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Supprimer une application (retirer un candidat d'un job)
    """
    # Récupérer l'application
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    session.delete(application)
    session.commit()
    
    return None

