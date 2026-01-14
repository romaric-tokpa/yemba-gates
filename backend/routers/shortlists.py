"""
Routes pour la gestion des shortlists (US11, US12, US13)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from database_tenant import get_session
from models import User, UserRole, Application, Candidate, Job
from auth import get_current_active_user, require_client, require_recruteur

router = APIRouter(prefix="/shortlists", tags=["shortlists"])


class ShortlistItem(BaseModel):
    """Item de shortlist avec informations candidat et job"""
    model_config = ConfigDict(from_attributes=True)

    application_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: Optional[str]
    candidate_phone: Optional[str]
    candidate_tags: Optional[List[str]]
    candidate_cv_path: Optional[str]
    job_id: str
    job_title: str
    job_department: Optional[str]
    client_feedback: Optional[str]
    client_validated: Optional[bool]
    client_validated_at: Optional[datetime]
    has_new_feedback: bool  # Flag pour indiquer si le recruteur a vu le feedback
    created_at: datetime


class ShortlistValidation(BaseModel):
    """Schéma pour valider/rejeter un candidat"""
    validated: bool  # True = validé, False = rejeté
    feedback: Optional[str] = None  # Commentaire du client


@router.get("/", response_model=List[ShortlistItem])
def get_client_shortlists(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupère toutes les shortlists
    
    - Clients : voient les shortlists pour leurs propres postes (même département)
    - Recruteurs : voient les shortlists pour les jobs qu'ils ont créés
    - Managers : voient toutes les shortlists
    """
    from sqlalchemy import or_, and_
    
    # Construire la requête selon le rôle
    # current_user.role est une string, donc on compare avec la valeur de l'enum
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    if user_role == UserRole.CLIENT.value:
        # Clients : shortlists pour les besoins qu'ils ont créés
        # Afficher tous les candidats en shortlist, même s'ils ont déjà été validés/rejetés
        applications_statement = (
            select(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
            .where(Job.created_by == current_user.id)
            .where(Application.is_in_shortlist == True)
        )
    elif user_role == UserRole.RECRUTEUR.value:
        # Recruteurs : jobs qu'ils ont créés
        applications_statement = (
            select(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
            .where(Job.created_by == current_user.id)
            .where(Application.is_in_shortlist == True)
            .where(Application.status == "shortlist")
        )
    else:
        # Managers et Administrateurs : toutes les shortlists
        applications_statement = (
            select(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
            .where(Application.is_in_shortlist == True)
            .where(Application.status == "shortlist")
        )
    
    results = session.exec(applications_statement).all()
    
    shortlist_items = []
    for app, candidate, job in results:
        shortlist_items.append({
            "application_id": str(app.id),
            "candidate_id": str(candidate.id),
            "candidate_name": f"{candidate.first_name} {candidate.last_name}",
            "candidate_email": candidate.email,
            "candidate_phone": candidate.phone,
            "candidate_tags": candidate.tags,
            "candidate_cv_path": candidate.cv_file_path,
            "job_id": str(job.id),
            "job_title": job.title,
            "job_department": job.department,
            "client_feedback": app.client_feedback,
            "client_validated": app.client_validated,
            "client_validated_at": app.client_validated_at,
            "has_new_feedback": app.client_validated is not None and app.client_validated_at is not None,
            "created_at": app.created_at.isoformat() if app.created_at else ""
        })
    
    return shortlist_items


@router.post("/{application_id}/validate", response_model=ShortlistItem)
def validate_candidate(
    application_id: UUID,
    validation: ShortlistValidation,
    current_user: User = Depends(require_client),
    session: Session = Depends(get_session)
):
    """
    Valider ou rejeter un candidat dans la shortlist (US12, US13)
    
    Le client peut valider ou rejeter un candidat et ajouter un commentaire.
    Une notification est créée pour le recruteur.
    """
    # Récupérer l'application
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Vérifier que le job appartient au client (créé par le client)
    job = session.get(Job, application.job_id)
    if not job or job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cette candidature"
        )
    
    # Vérifier que c'est bien en shortlist
    if not application.is_in_shortlist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce candidat n'est pas en shortlist"
        )
    
    # Permettre la validation même si le statut n'est pas exactement "shortlist"
    # (par exemple si le client veut modifier sa décision)
    # Mais empêcher si le statut est déjà définitif (embauché)
    if application.status == "embauché":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce candidat a déjà été embauché, la validation ne peut plus être modifiée"
        )
    
    # Mettre à jour la validation
    application.client_validated = validation.validated
    application.client_validated_at = datetime.utcnow()
    application.client_feedback = validation.feedback
    
    # Si validé, on peut passer au statut "offre", sinon "rejeté"
    if validation.validated:
        application.status = "offre"
        # Mettre à jour aussi le statut du candidat
        candidate = session.get(Candidate, application.candidate_id)
        if candidate:
            candidate.status = "offre"
    else:
        application.status = "rejeté"
        # Mettre à jour aussi le statut du candidat
        candidate = session.get(Candidate, application.candidate_id)
        if candidate:
            candidate.status = "rejeté"
    
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Si l'offre est acceptée (validated=True), notifier les managers
    # Gérer l'erreur si le service de notification n'existe pas
    if validation.validated:
        try:
            from services.notifications import notify_managers_on_offer_accepted
            notify_managers_on_offer_accepted(session, application)
        except ImportError:
            # Le service de notification n'existe pas, on continue quand même
            pass
        except Exception as e:
            # Logger l'erreur mais ne pas bloquer la validation
            print(f"⚠️ Erreur lors de la notification des managers: {e}")
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    if not candidate or not job:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des données"
        )
    
    return {
        "application_id": str(application.id),
        "candidate_id": str(candidate.id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}",
        "candidate_email": candidate.email,
        "candidate_phone": candidate.phone,
        "candidate_tags": candidate.tags,
        "candidate_cv_path": candidate.cv_file_path,
        "job_id": str(job.id),
        "job_title": job.title,
        "job_department": job.department,
        "client_feedback": application.client_feedback,
        "client_validated": application.client_validated,
        "client_validated_at": application.client_validated_at,
        "has_new_feedback": True,
        "created_at": application.created_at
    }


@router.get("/notifications", response_model=List[ShortlistItem])
def get_recruiter_notifications(
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Récupère les notifications pour le recruteur (shortlists avec feedback client)
    
    Les recruteurs voient les candidatures qu'ils ont créées et qui ont reçu un feedback client
    """
    # Trouver les applications créées par ce recruteur qui ont un feedback client
    from sqlalchemy import and_
    applications_statement = (
        select(Application, Candidate, Job)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .join(Job, Application.job_id == Job.id)
        .where(Application.created_by == current_user.id)
        .where(
            and_(
                Application.client_validated.isnot(None),
                Application.client_validated_at.isnot(None)
            )
        )
    )
    
    results = session.exec(applications_statement).all()
    
    notifications = []
    for app, candidate, job in results:
        notifications.append({
            "application_id": str(app.id),
            "candidate_id": str(candidate.id),
            "candidate_name": f"{candidate.first_name} {candidate.last_name}",
            "candidate_email": candidate.email,
            "candidate_phone": candidate.phone,
            "candidate_tags": candidate.tags,
            "candidate_cv_path": candidate.cv_file_path,
            "job_id": str(job.id),
            "job_title": job.title,
            "job_department": job.department,
            "client_feedback": app.client_feedback,
            "client_validated": app.client_validated,
            "client_validated_at": app.client_validated_at,
            "has_new_feedback": True,
            "created_at": app.created_at.isoformat() if app.created_at else ""
        })
    
    return notifications

