"""
Script Python pour appliquer la migration d'ajout de la colonne updated_at
à la table notifications
"""
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

def apply_migration():
    """Applique la migration pour ajouter updated_at à notifications"""
    
    # Récupérer les variables d'environnement
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'recrutement_db')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    
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
        
        print("🔧 Application de la migration pour ajouter updated_at à notifications...")
        
        # Ajouter la colonne updated_at
        print("  - Ajout de la colonne updated_at...")
        cursor.execute("""
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        """)
        
        # Mettre à jour les valeurs existantes
        print("  - Mise à jour des valeurs existantes...")
        cursor.execute("""
            UPDATE notifications 
            SET updated_at = created_at 
            WHERE updated_at IS NULL;
        """)
        
        # Créer la fonction trigger
        print("  - Création de la fonction trigger...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_notifications_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)
        
        # Supprimer le trigger s'il existe
        print("  - Suppression de l'ancien trigger si existe...")
        cursor.execute("""
            DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
        """)
        
        # Créer le trigger
        print("  - Création du trigger...")
        cursor.execute("""
            CREATE TRIGGER update_notifications_updated_at 
            BEFORE UPDATE ON notifications
            FOR EACH ROW 
            EXECUTE FUNCTION update_notifications_updated_at();
        """)
        
        print("✅ Migration appliquée avec succès!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        raise

if __name__ == "__main__":
    apply_migration()

