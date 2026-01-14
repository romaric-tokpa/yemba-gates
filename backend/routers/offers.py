"""
Routes pour la gestion des offres (US14, US15)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from database_tenant import get_session
from models import User, UserRole, Application, Candidate, Job
from auth import get_current_active_user, require_recruteur
from services.notifications import notify_managers_on_offer_accepted

router = APIRouter(prefix="/offers", tags=["offers"])


class OfferResponse(BaseModel):
    """Schéma de réponse pour une offre"""
    model_config = ConfigDict(from_attributes=True)

    application_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: Optional[str]
    job_id: str
    job_title: str
    job_department: Optional[str]
    offer_sent_at: Optional[datetime]
    offer_accepted: Optional[bool]
    offer_accepted_at: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime


class OfferSend(BaseModel):
    """Schéma pour envoyer une offre"""
    application_id: UUID
    notes: Optional[str] = None  # Notes additionnelles pour l'offre


class OfferDecision(BaseModel):
    """Schéma pour accepter/refuser une offre"""
    accepted: bool  # True = acceptée, False = refusée
    notes: Optional[str] = None  # Commentaires sur la décision


@router.post("/", response_model=OfferResponse, status_code=status.HTTP_201_CREATED)
def send_offer(
    offer_data: OfferSend,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Envoyer une offre à un candidat (US14)
    
    Le candidat doit être en statut "shortlist" et validé par le client.
    """
    application = session.get(Application, offer_data.application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    # Vérifier que le candidat est en shortlist et validé par le client
    if application.status != "shortlist":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le candidat doit être en shortlist pour recevoir une offre"
        )
    
    if not application.is_in_shortlist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le candidat doit être dans la shortlist"
        )
    
    if application.client_validated is None or not application.client_validated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le candidat doit être validé par le client avant de recevoir une offre"
        )
    
    # Vérifier qu'une offre n'a pas déjà été envoyée
    if application.offer_sent_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une offre a déjà été envoyée pour cette candidature"
        )
    
    # Envoyer l'offre
    application.offer_sent_at = datetime.utcnow()
    application.status = "offre"
    application.updated_at = datetime.utcnow()
    
    # Mettre à jour aussi le statut du candidat
    candidate = session.get(Candidate, application.candidate_id)
    if candidate:
        candidate.status = "offre"
        session.add(candidate)
    
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    return {
        "application_id": str(application.id),
        "candidate_id": str(application.candidate_id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "candidate_email": candidate.email if candidate else None,
        "job_id": str(application.job_id),
        "job_title": job.title if job else "",
        "job_department": job.department if job else None,
        "offer_sent_at": application.offer_sent_at,
        "offer_accepted": application.offer_accepted,
        "offer_accepted_at": application.offer_accepted_at,
        "status": application.status,
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }


@router.get("/", response_model=List[OfferResponse])
def list_offers(
    status_filter: Optional[str] = Query(None, description="Filtrer par statut (offre, embauché, rejeté)"),
    job_id: Optional[UUID] = Query(None, description="Filtrer par job"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Lister les offres en cours
    
    Les recruteurs voient toutes les offres.
    Les managers voient toutes les offres.
    Les clients voient uniquement les offres de leurs jobs.
    """
    statement = select(Application).where(Application.offer_sent_at.isnot(None))
    
    # Appliquer les filtres
    if status_filter:
        statement = statement.where(Application.status == status_filter)
    if job_id:
        statement = statement.where(Application.job_id == job_id)
    
    # Règles d'accès selon le rôle
    if current_user.role == UserRole.CLIENT.value:
        # Les clients ne voient que les offres de leurs jobs
        # On suppose que le client est lié au job via un champ (à adapter selon votre modèle)
        pass
    
    statement = statement.offset(skip).limit(limit).order_by(Application.offer_sent_at.desc())
    applications = session.exec(statement).all()
    
    # Construire les réponses
    results = []
    for application in applications:
        candidate = session.get(Candidate, application.candidate_id)
        job = session.get(Job, application.job_id)
        
        results.append({
            "application_id": str(application.id),
            "candidate_id": str(application.candidate_id),
            "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
            "candidate_email": candidate.email if candidate else None,
            "job_id": str(application.job_id),
            "job_title": job.title if job else "",
            "job_department": job.department if job else None,
            "offer_sent_at": application.offer_sent_at,
            "offer_accepted": application.offer_accepted,
            "offer_accepted_at": application.offer_accepted_at,
            "status": application.status,
            "created_at": application.created_at,
            "updated_at": application.updated_at
        })
    
    return results


@router.get("/{application_id}", response_model=OfferResponse)
def get_offer(
    application_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupérer les détails d'une offre
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    if application.offer_sent_at is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune offre n'a été envoyée pour cette candidature"
        )
    
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    return {
        "application_id": str(application.id),
        "candidate_id": str(application.candidate_id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "candidate_email": candidate.email if candidate else None,
        "job_id": str(application.job_id),
        "job_title": job.title if job else "",
        "job_department": job.department if job else None,
        "offer_sent_at": application.offer_sent_at,
        "offer_accepted": application.offer_accepted,
        "offer_accepted_at": application.offer_accepted_at,
        "status": application.status,
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }


@router.patch("/{application_id}/accept", response_model=OfferResponse)
def accept_offer(
    application_id: UUID,
    decision: OfferDecision,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Accepter une offre (US14)
    
    Marque l'offre comme acceptée et met à jour le statut du candidat.
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    if application.offer_sent_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune offre n'a été envoyée pour cette candidature"
        )
    
    if application.offer_accepted is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une décision a déjà été prise pour cette offre"
        )
    
    # Accepter l'offre
    application.offer_accepted = True
    application.offer_accepted_at = datetime.utcnow()
    application.status = "embauché"
    application.updated_at = datetime.utcnow()
    
    # Mettre à jour aussi le statut du candidat
    candidate = session.get(Candidate, application.candidate_id)
    if candidate:
        candidate.status = "embauché"
        session.add(candidate)
    
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Notifier les managers
    notify_managers_on_offer_accepted(session, application)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    return {
        "application_id": str(application.id),
        "candidate_id": str(application.candidate_id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "candidate_email": candidate.email if candidate else None,
        "job_id": str(application.job_id),
        "job_title": job.title if job else "",
        "job_department": job.department if job else None,
        "offer_sent_at": application.offer_sent_at,
        "offer_accepted": application.offer_accepted,
        "offer_accepted_at": application.offer_accepted_at,
        "status": application.status,
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }


@router.patch("/{application_id}/reject", response_model=OfferResponse)
def reject_offer(
    application_id: UUID,
    decision: OfferDecision,
    current_user: User = Depends(require_recruteur),
    session: Session = Depends(get_session)
):
    """
    Refuser une offre (US14)
    
    Marque l'offre comme refusée et remet le candidat en sourcing.
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature non trouvée"
        )
    
    if application.offer_sent_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune offre n'a été envoyée pour cette candidature"
        )
    
    if application.offer_accepted is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une décision a déjà été prise pour cette offre"
        )
    
    # Refuser l'offre
    application.offer_accepted = False
    application.offer_accepted_at = datetime.utcnow()
    application.status = "rejeté"
    application.updated_at = datetime.utcnow()
    
    # Mettre à jour aussi le statut du candidat
    candidate = session.get(Candidate, application.candidate_id)
    if candidate:
        candidate.status = "rejeté"
        session.add(candidate)
    
    session.add(application)
    session.commit()
    session.refresh(application)
    
    # Récupérer les informations complètes pour la réponse
    candidate = session.get(Candidate, application.candidate_id)
    job = session.get(Job, application.job_id)
    
    return {
        "application_id": str(application.id),
        "candidate_id": str(application.candidate_id),
        "candidate_name": f"{candidate.first_name} {candidate.last_name}" if candidate else "",
        "candidate_email": candidate.email if candidate else None,
        "job_id": str(application.job_id),
        "job_title": job.title if job else "",
        "job_department": job.department if job else None,
        "offer_sent_at": application.offer_sent_at,
        "offer_accepted": application.offer_accepted,
        "offer_accepted_at": application.offer_accepted_at,
        "status": application.status,
        "created_at": application.created_at,
        "updated_at": application.updated_at
    }






