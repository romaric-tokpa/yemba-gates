"""
Routes pour l'historique des modifications (US03, US06)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
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


class DeletedJobItem(BaseModel):
    """Item d'un besoin supprimé"""
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    title: str | None
    deleted_by: str
    deleted_by_name: str
    deleted_at: datetime
    last_status: str | None
    department: str | None
    created_at: datetime | None


@router.get("/deleted-jobs", response_model=List[DeletedJobItem])
def get_deleted_jobs(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer l'historique des besoins supprimés
    
    Retourne la liste des besoins qui ont été supprimés, basée sur l'historique.
    """
    # Récupérer toutes les entrées d'historique avec status "supprimé"
    deletion_history = session.exec(
        select(JobHistory).where(
            JobHistory.field_name == "status", 
            JobHistory.new_value == "supprimé"
        ).order_by(JobHistory.created_at.desc())
    ).all()
    
    if not deletion_history:
        return []
    
    results = []
    processed_job_ids = set()  # Pour éviter les doublons
    
    for deletion_entry in deletion_history:
        job_id = deletion_entry.job_id
        
        # Si job_id est NULL, c'est qu'il a été supprimé avec SET NULL
        # On peut quand même récupérer les informations depuis cette entrée
        if job_id is None:
            # Pour les entrées avec job_id NULL, on utilise l'ID de l'entrée comme identifiant
            entry_id = str(deletion_entry.id)
            if entry_id in processed_job_ids:
                continue
            processed_job_ids.add(entry_id)
            
            # Récupérer l'utilisateur qui a supprimé
            deleter = session.get(User, deletion_entry.modified_by)
            
            # Chercher d'autres entrées d'historique créées par le même utilisateur
            # autour de la même date (dans un délai de 10 secondes) pour récupérer titre/département
            title = None
            department = None
            last_status = deletion_entry.old_value
            
            # Chercher les entrées d'historique créées dans la même fenêtre de temps
            # par le même utilisateur (probablement le même job)
            time_window_start = deletion_entry.created_at - timedelta(seconds=10)
            time_window_end = deletion_entry.created_at + timedelta(seconds=10)
            
            similar_entries = session.exec(
                select(JobHistory)
                .where(
                    JobHistory.modified_by == deletion_entry.modified_by,
                    JobHistory.created_at >= time_window_start,
                    JobHistory.created_at <= time_window_end
                )
                .order_by(JobHistory.created_at.desc())
            ).all()
            
            for entry in similar_entries:
                if entry.field_name == "title":
                    title = entry.new_value or entry.old_value or title
                if entry.field_name == "department":
                    department = entry.new_value or entry.old_value or department
            
            results.append({
                "job_id": entry_id,  # Utiliser l'ID de l'entrée comme identifiant
                "title": title or "Besoin supprimé",
                "deleted_by": str(deletion_entry.modified_by),
                "deleted_by_name": f"{deleter.first_name} {deleter.last_name}" if deleter else "Inconnu",
                "deleted_at": deletion_entry.created_at,
                "last_status": last_status,
                "department": department,
                "created_at": deletion_entry.created_at
            })
        else:
            # Si job_id n'est pas NULL, vérifier si le job existe encore
            if job_id in processed_job_ids:
                continue
            
            job = session.get(Job, job_id)
            if job:
                # Le job existe encore, ce n'est pas un job supprimé
                continue
            
            # Le job n'existe plus, c'est un job supprimé
            processed_job_ids.add(job_id)
            
            # Récupérer toutes les entrées d'historique pour ce job
            all_history = session.exec(
                select(JobHistory)
                .where(JobHistory.job_id == job_id)
                .order_by(JobHistory.created_at.desc())
            ).all()
            
            # Si aucune entrée trouvée, utiliser uniquement l'entrée de suppression
            if not all_history:
                all_history = [deletion_entry]
            
            # Trouver la première entrée (création)
            first_history = all_history[-1] if all_history else deletion_entry
            
            # Chercher le titre et le département dans l'historique
            title = None
            department = None
            last_status = None
            
            for entry in all_history:
                if entry.field_name == "title":
                    title = entry.new_value or entry.old_value or title
                if entry.field_name == "department":
                    department = entry.new_value or entry.old_value or department
                if entry.field_name == "status":
                    if entry.new_value == "supprimé":
                        last_status = entry.old_value or last_status
                    elif not last_status:
                        last_status = entry.new_value or entry.old_value
            
            # Récupérer l'utilisateur qui a supprimé
            deleter = session.get(User, deletion_entry.modified_by)
            
            results.append({
                "job_id": str(job_id),
                "title": title or "Besoin supprimé",
                "deleted_by": str(deletion_entry.modified_by),
                "deleted_by_name": f"{deleter.first_name} {deleter.last_name}" if deleter else "Inconnu",
                "deleted_at": deletion_entry.created_at,
                "last_status": last_status,
                "department": department,
                "created_at": first_history.created_at if first_history else deletion_entry.created_at
            })
    
    # Trier par date de suppression (plus récent en premier)
    results.sort(key=lambda x: x["deleted_at"], reverse=True)
    
    return results
