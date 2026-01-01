#!/usr/bin/env python3
"""
Script pour corriger la contrainte CHECK du champ status dans la table jobs
Ajoute le statut 'en_attente' à la liste des statuts autorisés
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_status_constraint():
    """Corrige la contrainte CHECK pour inclure le statut 'en_attente'"""
    try:
        with engine.connect() as conn:
            # Supprimer l'ancienne contrainte si elle existe
            logger.info("Suppression de l'ancienne contrainte jobs_status_check...")
            conn.execute(text("""
                ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
            """))
            conn.commit()
            
            # Ajouter la nouvelle contrainte avec le statut 'en_attente'
            logger.info("Ajout de la nouvelle contrainte avec 'en_attente'...")
            conn.execute(text("""
                ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
                CHECK (status IN ('brouillon', 'validé', 'en_cours', 'clôturé', 'en_attente', 'en_attente_validation'));
            """))
            conn.commit()
            
            # Optionnel : Augmenter la taille du champ status si nécessaire
            logger.info("Augmentation de la taille du champ status à VARCHAR(50)...")
            try:
                conn.execute(text("""
                    ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);
                """))
                conn.commit()
                logger.info("Taille du champ status augmentée avec succès")
            except Exception as e:
                logger.warning(f"Impossible d'augmenter la taille du champ status (peut-être déjà fait): {e}")
            
            logger.info("✅ Contrainte CHECK mise à jour avec succès !")
            logger.info("Les statuts autorisés sont maintenant : 'brouillon', 'validé', 'en_cours', 'clôturé', 'en_attente', 'en_attente_validation'")
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de la mise à jour de la contrainte : {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_status_constraint()

