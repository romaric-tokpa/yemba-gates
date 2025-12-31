"""
Routes pour la gestion des besoins de recrutement (US01)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from database import get_session
from models import Job, JobStatus, UrgencyLevel, User, UserRole, JobHistory
from schemas import JobCreate, JobUpdate, JobResponse, JobSubmitForValidation
from auth import get_current_active_user, require_recruteur, require_manager
from datetime import datetime

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_data: JobCreate,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Créer un nouveau besoin de recrutement (US01)
    
    Permet de créer un besoin avec tous les champs obligatoires.
    Le besoin est créé en statut "brouillon" par défaut.
    """
    # Utiliser l'utilisateur connecté
    created_by = current_user.id
    
    # Création du job
    # Convertir les données
    job_data_dict = job_data.model_dump()
    
    # Préparer les données pour la création
    # Convertir l'urgence en string en minuscules si elle existe
    urgency_value = None
    if 'urgency' in job_data_dict and job_data_dict['urgency']:
        if isinstance(job_data_dict['urgency'], str):
            urgency_value = job_data_dict['urgency'].lower()
        elif hasattr(job_data_dict['urgency'], 'value'):
            urgency_value = job_data_dict['urgency'].value
        else:
            urgency_value = str(job_data_dict['urgency']).lower()
    
    # Créer le job avec les valeurs string directement (le modèle accepte maintenant des strings)
    job = Job(
        title=job_data_dict['title'],
        department=job_data_dict.get('department'),
        contract_type=job_data_dict.get('contract_type'),
        budget=job_data_dict.get('budget'),
        urgency=urgency_value,  # Utiliser directement la string
        status="brouillon",  # Utiliser directement la valeur string
        job_description_file_path=job_data_dict.get('job_description_file_path'),
        created_by=created_by
    )
    
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job


@router.get("/", response_model=List[JobResponse])
def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[JobStatus] = None,
    session: Session = Depends(get_session)
):
    """
    Lister tous les besoins de recrutement
    """
    statement = select(Job)
    
    if status_filter:
        statement = statement.where(Job.status == status_filter)
    
    statement = statement.offset(skip).limit(limit)
    
    jobs = session.exec(statement).all()
    return jobs


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Récupérer un besoin de recrutement par son ID
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    return job


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    job_update: JobUpdate,
    session: Session = Depends(get_session)
):
    """
    Mettre à jour un besoin de recrutement (sauvegarde en brouillon)
    
    Permet de modifier un besoin avant de le soumettre pour validation.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Mise à jour uniquement des champs fournis
    update_data = job_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)
    
    # Si on met à jour, on remet en brouillon si ce n'était pas déjà validé
    if job.status != JobStatus.VALIDE:
        job.status = JobStatus.BROUILLON
    
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job


@router.post("/{job_id}/submit", response_model=JobResponse)
def submit_job_for_validation(
    job_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Soumettre un besoin pour validation (US01)
    
    Change le statut du besoin pour qu'il puisse être validé par un manager.
    Le besoin doit avoir tous les champs obligatoires remplis.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Vérification des champs obligatoires
    if not job.title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le titre du poste est obligatoire"
        )
    
    # Le besoin reste en brouillon jusqu'à validation par un manager
    # Le statut sera changé à "validé" lors de la validation (US02)
    # Pour l'instant, on peut juste marquer qu'il est prêt pour validation
    # ou créer un nouveau statut "en_attente_validation"
    
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job


class JobValidation(BaseModel):
    """Schéma pour valider/rejeter un besoin"""
    validated: bool  # True = validé, False = rejeté
    feedback: Optional[str] = None  # Commentaire du manager


@router.post("/{job_id}/validate", response_model=JobResponse)
def validate_job(
    job_id: UUID,
    validation: JobValidation,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Valider ou rejeter un besoin de recrutement (US02)
    
    Permet à un manager de valider ou rejeter un besoin soumis pour validation.
    Notification envoyée au recruteur.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Enregistrer l'ancien statut pour l'historique
    old_status = job.status
    
    if validation.validated:
        # Valider le besoin
        job.status = "validé"
        job.validated_by = current_user.id
        job.validated_at = datetime.utcnow()
        
        # Enregistrer dans l'historique
        history_entry = JobHistory(
            job_id=job.id,
            modified_by=current_user.id,
            field_name="status",
            old_value=old_status,
            new_value="validé"
        )
        session.add(history_entry)
        
        # TODO: Envoyer une notification au recruteur
        # from services.notifications import create_notification
        # create_notification(...)
        
    else:
        # Rejeter le besoin (retour en brouillon)
        job.status = "brouillon"
        job.validated_by = None
        job.validated_at = None
        
        # Enregistrer dans l'historique
        history_entry = JobHistory(
            job_id=job.id,
            modified_by=current_user.id,
            field_name="status",
            old_value=old_status,
            new_value=f"Rejeté: {validation.feedback}" if validation.feedback else "Rejeté"
        )
        session.add(history_entry)
        
        # TODO: Envoyer une notification au recruteur avec le feedback
    
    job.updated_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job


@router.get("/pending-validation", response_model=List[JobResponse])
def get_pending_validation_jobs(
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_session)
):
    """
    Récupérer la liste des besoins en attente de validation (US02)
    
    Retourne les besoins qui ont été soumis mais pas encore validés/rejetés.
    """
    # Les besoins en brouillon qui ont été soumis (on peut ajouter un champ submitted_at si nécessaire)
    # Pour l'instant, on retourne les besoins en brouillon qui ne sont pas validés
    statement = select(Job).where(
        Job.status == "brouillon",
        Job.validated_by.is_(None)
    ).order_by(Job.created_at.desc())
    
    jobs = session.exec(statement).all()
    return jobs


@router.get("/{job_id}/history", response_model=List[dict])
def get_job_history(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupère l'historique des modifications d'un besoin de recrutement
    
    Retourne la liste des modifications apportées au besoin.
    """
    # Vérifier que le job existe
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Besoin de recrutement non trouvé"
        )
    
    # Récupérer l'historique
    history_statement = select(JobHistory).where(
        JobHistory.job_id == job_id
    ).order_by(JobHistory.created_at.desc())
    
    history_entries = session.exec(history_statement).all()
    
    # Formater la réponse
    history_list = []
    for entry in history_entries:
        # Récupérer le nom du modificateur
        modifier = session.get(User, entry.modified_by)
        modifier_name = f"{modifier.first_name} {modifier.last_name}" if modifier else "Inconnu"
        
        history_list.append({
            "id": str(entry.id),
            "job_id": str(entry.job_id),
            "modified_by": str(entry.modified_by),
            "modifier_name": modifier_name,
            "field_name": entry.field_name,
            "old_value": entry.old_value,
            "new_value": entry.new_value,
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        })
    
    return history_list

