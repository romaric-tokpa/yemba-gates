#!/usr/bin/env python3
"""
Script de migration pour ajouter les colonnes profile_title et years_of_experience
à la table candidates sans perdre les données existantes.

Utilise SQLModel/SQLAlchemy pour exécuter un ALTER TABLE.
"""

import os
import sys
from sqlalchemy import text
from database import engine, DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_candidate_fields():
    """
    Ajoute les colonnes profile_title et years_of_experience à la table candidates.
    Utilise IF NOT EXISTS pour éviter les erreurs si les colonnes existent déjà.
    """
    try:
        logger.info(f"Connexion à la base de données: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
        
        with engine.connect() as connection:
            # Démarrer une transaction
            trans = connection.begin()
            
            try:
                # Ajouter la colonne profile_title si elle n'existe pas
                logger.info("Ajout de la colonne profile_title...")
                connection.execute(text("""
                    ALTER TABLE candidates 
                    ADD COLUMN IF NOT EXISTS profile_title VARCHAR(255);
                """))
                logger.info("✅ Colonne profile_title ajoutée avec succès")
                
                # Ajouter la colonne years_of_experience si elle n'existe pas
                logger.info("Ajout de la colonne years_of_experience...")
                connection.execute(text("""
                    ALTER TABLE candidates 
                    ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
                """))
                logger.info("✅ Colonne years_of_experience ajoutée avec succès")
                
                # Ajouter les commentaires pour documentation
                logger.info("Ajout des commentaires...")
                connection.execute(text("""
                    COMMENT ON COLUMN candidates.profile_title IS 'Titre du profil du candidat (ex: Développeur Fullstack)';
                """))
                connection.execute(text("""
                    COMMENT ON COLUMN candidates.years_of_experience IS 'Nombre d''années d''expérience du candidat';
                """))
                
                # Commit de la transaction
                trans.commit()
                logger.info("✅ Migration terminée avec succès !")
                logger.info("Les colonnes profile_title et years_of_experience ont été ajoutées à la table candidates.")
                
            except Exception as e:
                # Rollback en cas d'erreur
                trans.rollback()
                logger.error(f"❌ Erreur lors de la migration: {e}")
                raise
                
    except Exception as e:
        logger.error(f"❌ Erreur de connexion à la base de données: {e}")
        logger.error("Vérifiez que PostgreSQL est démarré et que la base de données existe.")
        sys.exit(1)


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Migration: Ajout de profile_title et years_of_experience")
    logger.info("=" * 60)
    add_candidate_fields()

