#!/usr/bin/env python3
"""
Script pour ajouter la colonne scheduled_end_at à la table interviews
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

def add_scheduled_end_at():
    """Ajoute la colonne scheduled_end_at à la table interviews"""
    try:
        with engine.connect() as conn:
            logger.info("Ajout de la colonne 'scheduled_end_at' à la table 'interviews'...")
            conn.execute(text("""
                ALTER TABLE interviews 
                ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP WITH TIME ZONE;
            """))
            conn.commit()
            logger.info("✅ Colonne 'scheduled_end_at' ajoutée avec succès à la table 'interviews'.")
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'ajout de la colonne: {e}")
        logger.info("💡 La colonne existe peut-être déjà. Vérifiez avec:")
        logger.info("   SELECT column_name FROM information_schema.columns WHERE table_name = 'interviews' AND column_name = 'scheduled_end_at';")
        sys.exit(1)

if __name__ == "__main__":
    add_scheduled_end_at()
