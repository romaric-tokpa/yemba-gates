"""
Script pour appliquer la migration qui ajoute la colonne meeting_link à la table interviews
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def apply_migration():
    """Applique la migration pour ajouter meeting_link"""
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
        sql_file = os.path.join(script_dir, "add_meeting_link_to_interviews.sql")
        with open(sql_file, "r") as f:
            sql = f.read()
        
        # Exécuter la migration
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Migration appliquée avec succès: meeting_link ajouté à la table interviews")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    apply_migration()

