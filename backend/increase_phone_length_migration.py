"""
Script de migration directe pour augmenter la longueur du champ phone dans la table candidates.
À exécuter si Alembic pose problème.
"""
import os
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/recrutement_db"
)

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Vérifier la longueur actuelle de la colonne
        inspector = inspect(connection)
        columns = inspector.get_columns('candidates')
        phone_column = next((col for col in columns if col['name'] == 'phone'), None)
        
        if phone_column:
            current_length = phone_column.get('type').length if hasattr(phone_column.get('type'), 'length') else None
            logger.info(f"Longueur actuelle du champ phone: {current_length}")
            
            if current_length and current_length < 30:
                logger.info("Augmentation de la longueur du champ 'phone' à 30 caractères...")
                connection.execute(text("ALTER TABLE candidates ALTER COLUMN phone TYPE VARCHAR(30);"))
                connection.commit()
                logger.info("Champ 'phone' modifié avec succès.")
            else:
                logger.info("Le champ 'phone' a déjà une longueur >= 30 caractères.")
        else:
            logger.warning("La colonne 'phone' n'existe pas dans la table 'candidates'.")
        
        logger.info("Migration terminée.")

if __name__ == "__main__":
    run_migration()

