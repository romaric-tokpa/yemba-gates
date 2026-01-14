"""
Configuration de la base de données avec support multi-tenant
Cette version utilise le système de gestion de tenants pour isoler les données
"""
from sqlmodel import SQLModel, Session
from typing import Generator
import logging
from tenant_manager import get_tenant_session, get_current_tenant_id

# IMPORTANT: Importer tous les modèles pour qu'ils soient enregistrés dans SQLModel.metadata
# Cela permet à create_all() de créer toutes les tables
from models import (
    User, Job, Candidate, Interview, Application, Notification,
    JobHistory, ApplicationHistory, Offer, OnboardingChecklist,
    SecurityLog, Setting, Team, TeamMember, JobRecruiter,
    ClientInterviewRequest, CandidateJobComparison
)

logger = logging.getLogger(__name__)


def get_session() -> Generator[Session, None, None]:
    """
    Générateur de sessions de base de données pour le tenant actuel
    Utilise le système de gestion de tenants pour isoler les données
    
    IMPORTANT: Cette fonction doit être appelée après que le middleware tenant
    ait identifié le tenant et configuré le contexte.
    """
    try:
        session = get_tenant_session()
        try:
            yield session
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Erreur lors de la création de la session tenant: {str(e)}")
        raise


def init_db():
    """
    Initialise les tables dans la base de données du tenant actuel
    Doit être appelé après que le tenant soit identifié
    """
    try:
        tenant_id = get_current_tenant_id()
        logger.info(f"Initialisation de la base de données pour le tenant {tenant_id}")
        
        # Obtenir la session du tenant
        session = get_tenant_session()
        try:
            SQLModel.metadata.create_all(session.bind)
            logger.info(f"Base de données initialisée avec succès pour le tenant {tenant_id}")
        finally:
            session.close()
    except Exception as e:
        logger.warning(f"Impossible d'initialiser la base de données: {e}")
        logger.warning("Assurez-vous que le tenant est identifié et que la base de données existe")


def get_engine():
    """
    Retourne l'engine SQLAlchemy pour le tenant actuel
    Utilisé pour les opérations qui nécessitent directement l'engine
    """
    from tenant_manager import current_tenant_db
    engine = current_tenant_db.get()
    if not engine:
        from tenant_manager import get_tenant_engine, get_current_tenant_id
        tenant_id = get_current_tenant_id()
        engine = get_tenant_engine(tenant_id)
    return engine
