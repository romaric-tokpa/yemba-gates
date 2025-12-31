"""
Configuration de la base de données PostgreSQL avec SQLModel
"""
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
import os
from dotenv import load_dotenv
import logging

# IMPORTANT: Importer tous les modèles pour qu'ils soient enregistrés dans SQLModel.metadata
# Cela permet à create_all() de créer toutes les tables
from models import (
    User, Job, Candidate, Interview, Application, Notification,
    JobHistory, ApplicationHistory, Offer, OnboardingChecklist,
    SecurityLog, Setting
)

logger = logging.getLogger(__name__)

# Charger les variables d'environnement depuis .env si disponible
try:
    load_dotenv()
except Exception as e:
    # Si le fichier .env n'existe pas ou n'est pas accessible, continuer avec les variables d'environnement système
    logger.warning(f"Impossible de charger le fichier .env: {e}")
    logger.info("Utilisation des variables d'environnement système")

# URL de connexion à PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/recrutement_db"
)

# Création du moteur de base de données
engine = create_engine(DATABASE_URL, echo=True)


def init_db():
    """Initialise les tables dans la base de données"""
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Base de données initialisée avec succès")
    except Exception as e:
        logger.warning(f"Impossible d'initialiser la base de données: {e}")
        logger.warning("Assurez-vous que PostgreSQL est démarré et que la base 'recrutement_db' existe")
        logger.warning("Créez la base avec: createdb recrutement_db")


def get_session() -> Generator[Session, None, None]:
    """Générateur de sessions de base de données"""
    with Session(engine) as session:
        yield session

