"""
Script de migration pour ajouter profile_picture_url et skills à la table candidates
Exécutez ce script une seule fois pour mettre à jour votre base de données.
"""
import os
import psycopg2
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# URL de connexion à PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/recrutement_db"
)

def migrate():
    """Ajoute les colonnes profile_picture_url et skills à la table candidates"""
    try:
        # Parser l'URL de connexion
        # Format: postgresql://user:password@host:port/database
        url_parts = DATABASE_URL.replace("postgresql://", "").split("/")
        auth_parts = url_parts[0].split("@")
        user_pass = auth_parts[0].split(":")
        host_port = auth_parts[1].split(":")
        
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        database = url_parts[1] if len(url_parts) > 1 else "recrutement_db"
        
        # Se connecter à la base de données
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("🔄 Migration en cours...")
        
        # Ajouter profile_picture_url si elle n'existe pas
        try:
            cursor.execute("""
                ALTER TABLE candidates 
                ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);
            """)
            print("✅ Colonne 'profile_picture_url' ajoutée (ou déjà existante)")
        except Exception as e:
            print(f"⚠️  Erreur lors de l'ajout de 'profile_picture_url': {e}")
        
        # Ajouter skills si elle n'existe pas
        try:
            cursor.execute("""
                ALTER TABLE candidates 
                ADD COLUMN IF NOT EXISTS skills TEXT[];
            """)
            print("✅ Colonne 'skills' ajoutée (ou déjà existante)")
        except Exception as e:
            print(f"⚠️  Erreur lors de l'ajout de 'skills': {e}")
        
        # Ajouter les commentaires
        try:
            cursor.execute("""
                COMMENT ON COLUMN candidates.profile_picture_url IS 'URL de la photo de profil du candidat';
            """)
            cursor.execute("""
                COMMENT ON COLUMN candidates.skills IS 'Liste des compétences du candidat (tableau PostgreSQL)';
            """)
            print("✅ Commentaires ajoutés")
        except Exception as e:
            print(f"⚠️  Erreur lors de l'ajout des commentaires: {e}")
        
        cursor.close()
        conn.close()
        
        print("✅ Migration terminée avec succès !")
        print("💡 Vous pouvez maintenant redémarrer le serveur backend.")
        
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        print("💡 Vérifiez que PostgreSQL est démarré et que la base de données existe.")
        raise


if __name__ == "__main__":
    migrate()

