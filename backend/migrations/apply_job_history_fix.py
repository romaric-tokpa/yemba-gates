"""
Script pour appliquer la correction de la contrainte job_history
Permet de conserver l'historique même après suppression d'un job
"""
import psycopg2
from psycopg2 import sql
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def apply_migration():
    """Applique la migration pour corriger la contrainte job_history"""
    
    # Récupérer les variables d'environnement
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'recrutement_db')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    
    # Lire le fichier SQL
    migration_file = Path(__file__).parent / "fix_job_history_cascade.sql"
    
    if not migration_file.exists():
        print(f"❌ Fichier de migration non trouvé: {migration_file}")
        return False
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    try:
        # Connexion à la base de données
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Exécuter la migration
        cursor.execute(sql_content)
        
        print("✅ Migration appliquée avec succès!")
        print("   La contrainte job_history a été modifiée pour conserver l'historique après suppression.")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        return False

if __name__ == "__main__":
    apply_migration()

