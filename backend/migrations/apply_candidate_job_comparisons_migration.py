"""
Script pour appliquer la migration qui crée la table candidate_job_comparisons
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def apply_migration():
    """Applique la migration pour créer la table candidate_job_comparisons"""
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "recrutement_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "")
    )
    
    try:
        cursor = conn.cursor()
        
        # Obtenir le répertoire du script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Lire le fichier SQL
        sql_file = os.path.join(script_dir, "create_candidate_job_comparisons_table.sql")
        with open(sql_file, "r") as f:
            sql = f.read()
        
        # Exécuter la migration
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Migration appliquée avec succès: table candidate_job_comparisons créée")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    apply_migration()

