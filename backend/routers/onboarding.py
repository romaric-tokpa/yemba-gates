"""
Routes pour la gestion de l'onboarding (US15, US16)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from database import get_session
from models import User, UserRole, Application, Candidate, Job
from auth import get_current_active_user, require_recruteur

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingChecklistItem(BaseModel):
    """Item de la checklist onboarding"""
    id: str
    label: str
    completed: bool
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None


class OnboardingChecklist(BaseModel):
    """Checklist onboarding complète"""
    application_id: str
    candidate_name: str
    job_title: str
    contract_signed: bool = False
    contract_signed_at: Optional[datetime] = None
    equipment_ready: bool = False
    equipment_ready_at: Optional[datetime] = None
    training_scheduled: bool = False
    training_scheduled_at: Optional[datetime] = None
    access_granted: bool = False
    access_granted_at: Optional[datetime] = None
    welcome_meeting_scheduled: bool = False
    welcome_meeting_scheduled_at: Optional[datetime] = None
    onboarding_completed: bool = False
    onboarding_completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OnboardingChecklistUpdate(BaseModel):
    """Schéma pour mettre à jour la checklist"""
    contract_signed: Optional[bool] = None
    equipment_ready: Optional[bool] = None
    training_scheduled: Optional[bool] = None
    access_granted: Optional[bool] = None
    welcome_meeting_scheduled: Optional[bool] = None
    notes: Optional[str] = None


@router.get("/{application_id}", response_model=OnboardingChecklist)
def get_onboarding_checklist(
    application_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer la checklist onboarding pour une candidature (US15)
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Vérifier que l'offre a été acceptée
    if application.offer_accepted is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'offre doit être acceptée avant de commencer l'onboarding"
        )
    
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    # Construire la checklist à partir des champs de l'application
    # Note: Pour une implémentation complète, on pourrait créer une table dédiée
    # Pour l'instant, on utilise les champs existants et on simule la checklist
    
    return {
        "application_id": str(application.id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "contract_signed": application.onboarding_completed,  # Simplification
        "contract_signed_at": application.onboarding_completed_at if application.onboarding_completed else None,
        "equipment_ready": False,  # À implémenter dans une table dédiée
        "equipment_ready_at": None,
        "training_scheduled": False,  # À implémenter dans une table dédiée
        "training_scheduled_at": None,
        "access_granted": False,  # À implémenter dans une table dédiée
        "access_granted_at": None,
        "welcome_meeting_scheduled": False,  # À implémenter dans une table dédiée
        "welcome_meeting_scheduled_at": None,
        "onboarding_completed": application.onboarding_completed,
        "onboarding_completed_at": application.onboarding_completed_at,
        "notes": None,  # À implémenter dans une table dédiée
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }


@router.patch("/{application_id}/checklist", response_model=OnboardingChecklist)
def update_onboarding_checklist(
    application_id: UUID,
    checklist_data: OnboardingChecklistUpdate,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Mettre à jour la checklist onboarding (US15)
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Vérifier que l'offre a été acceptée
    if application.offer_accepted is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'offre doit être acceptée avant de commencer l'onboarding"
        )
    
    # Mettre à jour les champs
    # Note: Pour une implémentation complète, on devrait créer une table onboarding_checklist
    # Pour l'instant, on utilise les champs existants de Application
    
    if checklist_data.contract_signed is not None:
        # Si le contrat est signé, on peut considérer que l'onboarding est en cours
        pass
    
    application.updated_at = datetime.utcnow()
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    return {
        "application_id": str(application.id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "contract_signed": application.onboarding_completed,
        "contract_signed_at": application.onboarding_completed_at if application.onboarding_completed else None,
        "equipment_ready": False,
        "equipment_ready_at": None,
        "training_scheduled": False,
        "training_scheduled_at": None,
        "access_granted": False,
        "access_granted_at": None,
        "welcome_meeting_scheduled": False,
        "welcome_meeting_scheduled_at": None,
        "onboarding_completed": application.onboarding_completed,
        "onboarding_completed_at": application.onboarding_completed_at,
        "notes": None,
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }


@router.post("/{application_id}/complete", response_model=OnboardingChecklist)
def complete_onboarding(
    application_id: UUID,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Marquer l'onboarding comme terminé (US15, US16)
    
    Clôture le processus de recrutement.
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Vérifier que l'offre a été acceptée
    if application.offer_accepted is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'offre doit être acceptée avant de compléter l'onboarding"
        )
    
    # Marquer l'onboarding comme terminé
    application.onboarding_completed = True
    application.onboarding_completed_at = datetime.utcnow()
    application.status = "embauché"  # S'assurer que le statut est bien "embauché"
    application.updated_at = datetime.utcnow()
    
    # Mettre à jour aussi le statut du candidat
    candidate = session.get(Candidate, application.candidate_id)
    if candidate:
        candidate.status = "embauché"
        session.add(candidate)
    
    # Optionnellement, clôturer le job si tous les postes sont pourvus
    # Cette logique peut être ajoutée selon les besoins
    
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    return {
        "application_id": str(application.id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "job_title": job.title if job else "",
        "contract_signed": True,
        "contract_signed_at": application.onboarding_completed_at,
        "equipment_ready": True,  # On considère que tout est prêt si l'onboarding est complété
        "equipment_ready_at": application.onboarding_completed_at,
        "training_scheduled": True,
        "training_scheduled_at": application.onboarding_completed_at,
        "access_granted": True,
        "access_granted_at": application.onboarding_completed_at,
        "welcome_meeting_scheduled": True,
        "welcome_meeting_scheduled_at": application.onboarding_completed_at,
        "onboarding_completed": True,
        "onboarding_completed_at": application.onboarding_completed_at,
        "notes": None,
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }


@router.get("/", response_model=List[OnboardingChecklist])
def list_onboarding(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Lister tous les onboarding en cours (US16)
    
    Affiche uniquement les candidatures avec offre acceptée et onboarding non terminé.
    """
    statement = select(Application).where(
        Application.offer_accepted == True,
        Application.onboarding_completed == False
    )
    
    statement = statement.offset(skip).limit(limit).order_by(Application.offer_accepted_at.desc())
    applications = session.exec(statement).all()
    
    # Construire les réponses
    results = []
    for application in applications:
        candidate = session.get(Candidate, application.candidate_id)
        job = session.get(Job, application.job_id)
        
        results.append({
            "application_id": str(application.id),
            "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
            "job_title": job.title if job else "",
            "contract_signed": False,
            "contract_signed_at": None,
            "equipment_ready": False,
            "equipment_ready_at": None,
            "training_scheduled": False,
            "training_scheduled_at": None,
            "access_granted": False,
            "access_granted_at": None,
            "welcome_meeting_scheduled": False,
            "welcome_meeting_scheduled_at": None,
            "onboarding_completed": False,
            "onboarding_completed_at": None,
            "notes": None,
            "created_at": application.created_at,
            "updated_at": application.updated_at
        })
    
    return results






