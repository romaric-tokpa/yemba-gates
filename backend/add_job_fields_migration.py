"""
Script SQL direct pour ajouter les nouvelles colonnes à la table jobs
À exécuter si Alembic n'est pas configuré ou si vous préférez une migration manuelle
"""
import psycopg2
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Récupérer l'URL de la base de données
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/recrutement_db"
)

def add_job_columns():
    """Ajoute les nouvelles colonnes à la table jobs"""
    try:
        # Se connecter à la base de données
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("🔄 Ajout des nouvelles colonnes à la table jobs...")
        
        # Liste des colonnes à ajouter avec leurs types
        columns_to_add = [
            ("manager_demandeur", "VARCHAR(255)"),
            ("entreprise", "VARCHAR(255)"),
            ("motif_recrutement", "VARCHAR(50)"),
            ("date_prise_poste", "DATE"),
            ("missions_principales", "TEXT"),
            ("missions_secondaires", "TEXT"),
            ("kpi_poste", "TEXT"),
            ("niveau_formation", "VARCHAR(20)"),
            ("experience_requise", "INTEGER"),
            ("competences_techniques_obligatoires", "TEXT[]"),
            ("competences_techniques_souhaitees", "TEXT[]"),
            ("competences_comportementales", "TEXT[]"),
            ("langues_requises", "TEXT"),
            ("certifications_requises", "TEXT"),
            ("localisation", "VARCHAR(255)"),
            ("mobilite_deplacements", "VARCHAR(20)"),
            ("teletravail", "VARCHAR(20)"),
            ("contraintes_horaires", "TEXT"),
            ("criteres_eliminatoires", "TEXT"),
            ("salaire_minimum", "FLOAT"),
            ("salaire_maximum", "FLOAT"),
            ("avantages", "TEXT[]"),
            ("evolution_poste", "TEXT"),
        ]
        
        # Vérifier quelles colonnes existent déjà
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'jobs'
        """)
        existing_columns = {row[0] for row in cur.fetchall()}
        
        # Ajouter uniquement les colonnes qui n'existent pas
        for column_name, column_type in columns_to_add:
            if column_name not in existing_columns:
                try:
                    # Pour les colonnes optionnelles, on les ajoute avec DEFAULT NULL
                    if column_name in ["missions_principales", "niveau_formation", "localisation", "criteres_eliminatoires"]:
                        # Ces colonnes sont requises dans le modèle mais peuvent être NULL temporairement
                        cur.execute(f'ALTER TABLE jobs ADD COLUMN "{column_name}" {column_type} DEFAULT NULL')
                    else:
                        cur.execute(f'ALTER TABLE jobs ADD COLUMN "{column_name}" {column_type} DEFAULT NULL')
                    print(f"✅ Colonne '{column_name}' ajoutée")
                except psycopg2.errors.DuplicateColumn:
                    print(f"⚠️  Colonne '{column_name}' existe déjà, ignorée")
                except Exception as e:
                    print(f"❌ Erreur lors de l'ajout de la colonne '{column_name}': {e}")
            else:
                print(f"ℹ️  Colonne '{column_name}' existe déjà, ignorée")
        
        # Commit des changements
        conn.commit()
        print("\n✅ Migration terminée avec succès!")
        
    except psycopg2.Error as e:
        print(f"❌ Erreur PostgreSQL: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"❌ Erreur: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    add_job_columns()
