"""
Routes pour l'historique des modifications (US03, US06)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from database import get_session
from models import User, UserRole, JobHistory, ApplicationHistory, Job, Application, Candidate
from auth import get_current_active_user

router = APIRouter(prefix="/history", tags=["history"])


class JobHistoryItem(BaseModel):
    """Item d'historique d'un job"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    modified_by: str
    modified_by_name: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: datetime


class ApplicationHistoryItem(BaseModel):
    """Item d'historique d'une candidature"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    changed_by: str
    changed_by_name: str
    old_status: Optional[str]
    new_status: Optional[str]
    notes: Optional[str]
    created_at: datetime


@router.get("/jobs/{job_id}", response_model=List[JobHistoryItem])
def get_job_history(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer l'historique des modifications d'un besoin (US03)
    """
    # Vérifier que le job existe
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Récupérer l'historique
    statement = select(JobHistory).where(JobHistory.job_id == job_id).order_by(JobHistory.created_at.desc())
    history_items = session.exec(statement).all()
    
    # Construire les réponses avec les noms des utilisateurs
    results = []
    for item in history_items:
        modifier = session.get(User, item.modified_by)
        results.append({
            "id": str(item.id),
            "job_id": str(item.job_id),
            "modified_by": str(item.modified_by),
            "modified_by_name": f"{modifier.first_name} {modifier.last_name}" if modifier else "",
            "field_name": item.field_name,
            "old_value": item.old_value,
            "new_value": item.new_value,
            "created_at": item.created_at
        })
    
    return results


@router.get("/applications/{application_id}", response_model=List[ApplicationHistoryItem])
def get_application_history(
    application_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer l'historique d'une candidature (US06)
    """
    # Vérifier que l'application existe
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Récupérer l'historique
    statement = select(ApplicationHistory).where(
        ApplicationHistory.application_id == application_id
    ).order_by(ApplicationHistory.created_at.desc())
    history_items = session.exec(statement).all()
    
    # Construire les réponses avec les noms des utilisateurs
    results = []
    for item in history_items:
        changer = session.get(User, item.changed_by)
        results.append({
            "id": str(item.id),
            "application_id": str(item.application_id),
            "changed_by": str(item.changed_by),
            "changed_by_name": f"{changer.first_name} {changer.last_name}" if changer else "",
            "old_status": item.old_status,
            "new_status": item.new_status,
            "notes": item.notes,
            "created_at": item.created_at
        })
    
    return results


@router.get("/candidates/{candidate_id}", response_model=List[ApplicationHistoryItem])
def get_candidate_history(
    candidate_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer l'historique d'un candidat (US06)
    
    Retourne l'historique de toutes les candidatures du candidat.
    """
    # Vérifier que le candidat existe
    candidate = session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidat non trouvé"
        )
    
    # Trouver toutes les candidatures du candidat
    applications_statement = select(Application).where(Application.candidate_id == candidate_id)
    applications = session.exec(applications_statement).all()
    
    if not applications:
        return []
    
    # Récupérer l'historique de toutes les candidatures
    application_ids = [app.id for app in applications]
    statement = select(ApplicationHistory).where(
        ApplicationHistory.application_id.in_(application_ids)
    ).order_by(ApplicationHistory.created_at.desc())
    history_items = session.exec(statement).all()
    
    # Construire les réponses avec les noms des utilisateurs
    results = []
    for item in history_items:
        changer = session.get(User, item.changed_by)
        results.append({
            "id": str(item.id),
            "application_id": str(item.application_id),
            "changed_by": str(item.changed_by),
            "changed_by_name": f"{changer.first_name} {changer.last_name}" if changer else "",
            "old_status": item.old_status,
            "new_status": item.new_status,
            "notes": item.notes,
            "created_at": item.created_at
        })
    
    return results

