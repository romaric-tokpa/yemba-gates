"""
Utilitaires pour créer et gérer les bases de données tenant
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import re

logger = logging.getLogger(__name__)


def sanitize_db_name(name: str) -> str:
    """
    Nettoie et valide un nom de base de données PostgreSQL
    PostgreSQL n'accepte que: lettres, chiffres, underscore
    """
    # Remplacer les caractères invalides par des underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', name)
    # S'assurer que ça commence par une lettre ou underscore
    if not re.match(r'^[a-zA-Z_]', sanitized):
        sanitized = 'db_' + sanitized
    # Limiter la longueur (PostgreSQL limite à 63 caractères)
    if len(sanitized) > 63:
        sanitized = sanitized[:63]
    return sanitized.lower()


def create_tenant_database(
    db_name: str,
    admin_db_url: Optional[str] = None
) -> tuple[bool, Optional[str]]:
    """
    Crée une nouvelle base de données PostgreSQL pour un tenant
    
    Args:
        db_name: Nom de la base de données à créer (sera nettoyé automatiquement)
        admin_db_url: URL de connexion à PostgreSQL avec les droits admin
                     Si None, utilise les variables d'environnement
        
    Returns:
        Tuple (success: bool, error_message: Optional[str])
        - (True, None) si la création réussit
        - (False, error_message) si la création échoue
    """
    try:
        # Nettoyer le nom de la base
        sanitized_name = sanitize_db_name(db_name)
        
        # Construire l'URL de connexion admin si non fournie
        if not admin_db_url:
            db_user = os.getenv("POSTGRES_USER", "postgres")
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db_host = os.getenv("POSTGRES_HOST", "localhost")
            db_port = os.getenv("POSTGRES_PORT", "5432")
            # Se connecter à la base par défaut 'postgres' pour créer une nouvelle DB
            admin_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
        else:
            # Extraire les credentials de l'URL fournie
            from urllib.parse import urlparse
            parsed = urlparse(admin_db_url)
            db_user = parsed.username or os.getenv("POSTGRES_USER", "postgres")
            db_password = parsed.password or os.getenv("POSTGRES_PASSWORD", "postgres")
            db_host = parsed.hostname or os.getenv("POSTGRES_HOST", "localhost")
            db_port = str(parsed.port) if parsed.port else os.getenv("POSTGRES_PORT", "5432")
        
        # Créer un engine pour se connecter à la base 'postgres' (base système)
        admin_engine = create_engine(
            admin_db_url,
            isolation_level="AUTOCOMMIT"  # Requis pour CREATE DATABASE
        )
        
        logger.info(f"🔄 Création de la base de données: {sanitized_name}")
        
        with admin_engine.connect() as conn:
            # Vérifier si la base existe déjà
            check_query = text(
                "SELECT 1 FROM pg_database WHERE datname = :db_name"
            )
            result = conn.execute(check_query, {"db_name": sanitized_name})
            if result.fetchone():
                error_msg = f"La base de données '{sanitized_name}' existe déjà"
                logger.warning(f"⚠️  {error_msg}")
                return False, error_msg
            
            # Créer la base de données
            create_query = text(f'CREATE DATABASE "{sanitized_name}"')
            conn.execute(create_query)
            
            logger.info(f"✅ Base de données '{sanitized_name}' créée avec succès")
            
            # Se connecter à la nouvelle base pour créer l'extension UUID
            # Construire l'URL correctement avec le même utilisateur mais la nouvelle base
            tenant_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{sanitized_name}"
            tenant_engine = create_engine(tenant_db_url, isolation_level="AUTOCOMMIT")
            
            with tenant_engine.connect() as tenant_conn:
                # Activer l'extension UUID (pas besoin de commit avec AUTOCOMMIT)
                tenant_conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
                logger.info(f"✅ Extension uuid-ossp activée dans '{sanitized_name}'")
            
            tenant_engine.dispose()
        
        admin_engine.dispose()
        return True, None
        
    except SQLAlchemyError as e:
        error_msg = f"Erreur SQL lors de la création de la base '{db_name}': {str(e)}"
        logger.error(f"❌ {error_msg}")
        import traceback
        logger.error(traceback.format_exc())
        return False, error_msg
    except Exception as e:
        error_msg = f"Erreur inattendue lors de la création de la base '{db_name}': {str(e)}"
        logger.error(f"❌ {error_msg}")
        import traceback
        logger.error(traceback.format_exc())
        return False, error_msg


def apply_schema_to_database(
    db_url: str,
    schema_file_path: Optional[str] = None
) -> bool:
    """
    Applique le schéma SQL à une base de données
    
    Args:
        db_url: URL de connexion à la base de données
        schema_file_path: Chemin vers le fichier SQL (optionnel)
        
    Returns:
        True si l'application réussit, False sinon
    """
    try:
        from sqlmodel import create_engine, SQLModel
        from models import (
            User, Job, Candidate, Interview, Application, Notification,
            JobHistory, ApplicationHistory, Offer, OnboardingChecklist,
            SecurityLog, Setting, Team, TeamMember, JobRecruiter,
            ClientInterviewRequest, CandidateJobComparison
        )
        
        logger.info(f"🔄 Application du schéma à la base de données...")
        
        # Créer l'engine
        engine = create_engine(db_url, echo=False)
        
        # Utiliser SQLModel pour créer toutes les tables
        SQLModel.metadata.create_all(engine)
        
        logger.info(f"✅ Schéma appliqué avec succès")
        engine.dispose()
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'application du schéma: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def drop_tenant_database(
    db_name: str,
    admin_db_url: Optional[str] = None
) -> bool:
    """
    Supprime une base de données tenant (utilisé pour rollback)
    
    Args:
        db_name: Nom de la base de données à supprimer
        admin_db_url: URL de connexion admin
        
    Returns:
        True si la suppression réussit, False sinon
    """
    try:
        sanitized_name = sanitize_db_name(db_name)
        
        if not admin_db_url:
            db_user = os.getenv("POSTGRES_USER", "postgres")
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db_host = os.getenv("POSTGRES_HOST", "localhost")
            db_port = os.getenv("POSTGRES_PORT", "5432")
            admin_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
        
        admin_engine = create_engine(
            admin_db_url,
            isolation_level="AUTOCOMMIT"
        )
        
        logger.warning(f"🗑️  Suppression de la base de données: {sanitized_name}")
        
        with admin_engine.connect() as conn:
            # Terminer toutes les connexions à la base avant de la supprimer
            terminate_query = text("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = :db_name
                  AND pid <> pg_backend_pid()
            """)
            conn.execute(terminate_query, {"db_name": sanitized_name})
            
            # Supprimer la base de données
            drop_query = text(f'DROP DATABASE IF EXISTS "{sanitized_name}"')
            conn.execute(drop_query)
            
            logger.info(f"✅ Base de données '{sanitized_name}' supprimée")
        
        admin_engine.dispose()
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la suppression de la base '{db_name}': {str(e)}")
        return False
