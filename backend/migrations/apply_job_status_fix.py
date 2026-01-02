"""
Script Python pour appliquer la migration de mise à jour de la contrainte CHECK
sur le champ status de la table jobs
"""
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

def apply_migration():
    """Applique la migration pour mettre à jour la contrainte CHECK"""
    
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
        
        print("🔧 Application de la migration pour mettre à jour la contrainte CHECK...")
        
        # Supprimer l'ancienne contrainte
        print("  - Suppression de l'ancienne contrainte...")
        cursor.execute("""
            ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
        """)
        
        # Augmenter la taille du champ status
        print("  - Augmentation de la taille du champ status...")
        cursor.execute("""
            ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);
        """)
        
        # Ajouter la nouvelle contrainte
        print("  - Ajout de la nouvelle contrainte avec tous les statuts...")
        cursor.execute("""
            ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
            CHECK (status IN (
                'brouillon',
                'a_valider',
                'urgent',
                'tres_urgent',
                'besoin_courant',
                'validé',
                'en_cours',
                'gagne',
                'standby',
                'archive',
                'clôturé',
                'en_attente',
                'en_attente_validation'
            ));
        """)
        
        print("✅ Migration appliquée avec succès!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        raise

if __name__ == "__main__":
    apply_migration()

