"""
Service de gestion des notifications
"""
from datetime import datetime, timedelta
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from models import Notification, User, UserRole, Job, Application, Candidate
from services.email import send_notification_email


def create_notification(
    session: Session,
    user_id: UUID,
    title: str,
    message: str,
    notification_type: str,
    related_job_id: Optional[UUID] = None,
    related_application_id: Optional[UUID] = None,
    send_email: bool = True
) -> Notification:
    """
    Crée une notification et envoie un email si demandé
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_job_id=related_job_id,
        related_application_id=related_application_id,
        email_sent=False
    )
    
    session.add(notification)
    session.commit()
    session.refresh(notification)
    
    # Envoyer l'email si demandé
    if send_email:
        try:
            user = session.get(User, user_id)
            if user:
                send_notification_email(user.email, title, message)
                notification.email_sent = True
                notification.email_sent_at = datetime.utcnow()
                session.add(notification)
                session.commit()
        except Exception as e:
            # Log l'erreur mais ne bloque pas la création de la notification
            print(f"Erreur lors de l'envoi de l'email: {e}")
    
    return notification


def notify_managers_on_offer_accepted(
    session: Session,
    application: Application
) -> List[Notification]:
    """
    Notifie les managers lorsqu'une offre est acceptée
    """
    notifications = []
    
    # Trouver tous les managers
    managers_statement = select(User).where(User.role == UserRole.MANAGER.value).where(User.is_active == True)
    managers = session.exec(managers_statement).all()
    
    # Récupérer les informations du job et du candidat
    job = session.get(Job, application.job_id)
    candidate = session.get(Candidate, application.candidate_id)
    
    if not job or not candidate:
        return notifications
    
    candidate_name = f"{candidate.first_name} {candidate.last_name}"
    
    for manager in managers:
        notification = create_notification(
            session=session,
            user_id=manager.id,
            title="Offre acceptée",
            message=f"Le candidat {candidate_name} a accepté l'offre pour le poste '{job.title}'.",
            notification_type="offer_accepted",
            related_job_id=job.id,
            related_application_id=application.id,
            send_email=True
        )
        notifications.append(notification)
    
    return notifications


def check_and_notify_pending_jobs(session: Session) -> List[Notification]:
    """
    Vérifie les besoins en attente de validation depuis plus de 48h
    et notifie les managers
    """
    notifications = []
    
    # Calculer la date limite (48h avant maintenant)
    limit_date = datetime.utcnow() - timedelta(hours=48)
    
    # Trouver les jobs en brouillon créés il y a plus de 48h
    jobs_statement = (
        select(Job)
        .where(Job.status == "brouillon")
        .where(Job.created_at <= limit_date)
    )
    pending_jobs = session.exec(jobs_statement).all()
    
    if not pending_jobs:
        return notifications
    
    # Trouver tous les managers
    managers_statement = select(User).where(User.role == UserRole.MANAGER.value).where(User.is_active == True)
    managers = session.exec(managers_statement).all()
    
    for job in pending_jobs:
        # Vérifier si une notification n'a pas déjà été envoyée pour ce job
        existing_notification = session.exec(
            select(Notification)
            .where(Notification.related_job_id == job.id)
            .where(Notification.notification_type == "job_pending_validation")
        ).first()
        
        if existing_notification:
            continue  # Notification déjà envoyée
        
        for manager in managers:
            hours_pending = (datetime.utcnow() - job.created_at).total_seconds() / 3600
            
            notification = create_notification(
                session=session,
                user_id=manager.id,
                title="Besoin de validation en attente",
                message=f"Le besoin de recrutement '{job.title}' attend une validation depuis {int(hours_pending)} heures.",
                notification_type="job_pending_validation",
                related_job_id=job.id,
                send_email=True
            )
            notifications.append(notification)
    
    return notifications

