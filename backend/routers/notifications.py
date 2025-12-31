"""
Routes pour la gestion des notifications
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from database import get_session
from models import User, Notification
from auth import get_current_active_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    """Schéma de réponse pour une notification"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    message: str
    notification_type: str
    is_read: bool
    related_job_id: Optional[str] = None
    related_application_id: Optional[str] = None
    created_at: str
    read_at: Optional[str] = None


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Récupérer uniquement les notifications non lues"),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupère les notifications de l'utilisateur connecté
    """
    statement = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread_only:
        statement = statement.where(Notification.is_read == False)
    
    statement = statement.order_by(Notification.created_at.desc())
    
    notifications = session.exec(statement).all()
    
    return [
        {
            "id": str(n.id) if n.id else "",
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "related_job_id": str(n.related_job_id) if n.related_job_id else None,
            "related_application_id": str(n.related_application_id) if n.related_application_id else None,
            "created_at": n.created_at.isoformat() if n.created_at else "",
            "read_at": n.read_at.isoformat() if n.read_at else None,
        }
        for n in notifications
    ]


@router.get("/unread/count")
def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Récupère le nombre de notifications non lues
    
    Retourne 0 si l'utilisateur n'est pas authentifié (géré par la dépendance get_current_active_user)
    """
    try:
        from sqlalchemy import func
        from sqlmodel import select
        
        statement = (
            select(func.count(Notification.id))
            .where(Notification.user_id == current_user.id)
            .where(Notification.is_read == False)
        )
        
        count = session.exec(statement).first() or 0
        
        return {"unread_count": count}
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Erreur lors de la récupération du nombre de notifications non lues: {str(e)}")
        # Retourner 0 en cas d'erreur pour ne pas bloquer l'interface
        return {"unread_count": 0}


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Marque une notification comme lue
    """
    notification = session.get(Notification, notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification non trouvée"
        )
    
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à cette notification"
        )
    
    if not notification.is_read:
        from datetime import datetime
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        session.add(notification)
        session.commit()
    
    return {"message": "Notification marquée comme lue"}


@router.patch("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Marque toutes les notifications de l'utilisateur comme lues
    """
    from datetime import datetime
    from sqlalchemy import update
    
    statement = (
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
        .values(is_read=True, read_at=datetime.utcnow())
    )
    
    session.exec(statement)
    session.commit()
    
    return {"message": "Toutes les notifications ont été marquées comme lues"}


@router.post("/check-pending-jobs")
def trigger_check_pending_jobs(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Déclenche manuellement la vérification des jobs en attente de validation
    (Réservé aux managers et administrateurs)
    """
    from models import UserRole
    from services.notifications import check_and_notify_pending_jobs
    
    user_role = current_user.role if isinstance(current_user.role, str) else current_user.role.value
    if user_role not in [UserRole.MANAGER.value, UserRole.ADMINISTRATEUR.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé. Réservé aux managers et administrateurs."
        )
    
    notifications = check_and_notify_pending_jobs(session)
    
    return {
        "message": f"Vérification terminée. {len(notifications)} notification(s) créée(s).",
        "notifications_created": len(notifications)
    }

