"""
Script pour appliquer la migration des champs de statut aux entretiens
"""
import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def apply_migration():
    """Applique la migration pour ajouter les champs de statut aux entretiens"""
    
    migration_sql = """
    -- Ajouter la colonne status si elle n'existe pas
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interviews' AND column_name = 'status'
        ) THEN
            ALTER TABLE interviews ADD COLUMN status VARCHAR(20) DEFAULT 'planifié';
        END IF;
    END $$;

    -- Ajouter la colonne rescheduled_at si elle n'existe pas
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interviews' AND column_name = 'rescheduled_at'
        ) THEN
            ALTER TABLE interviews ADD COLUMN rescheduled_at TIMESTAMP;
        END IF;
    END $$;

    -- Ajouter la colonne rescheduling_reason si elle n'existe pas
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interviews' AND column_name = 'rescheduling_reason'
        ) THEN
            ALTER TABLE interviews ADD COLUMN rescheduling_reason TEXT;
        END IF;
    END $$;

    -- Ajouter la colonne cancellation_reason si elle n'existe pas
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interviews' AND column_name = 'cancellation_reason'
        ) THEN
            ALTER TABLE interviews ADD COLUMN cancellation_reason TEXT;
        END IF;
    END $$;

    -- Ajouter la colonne cancelled_at si elle n'existe pas
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interviews' AND column_name = 'cancelled_at'
        ) THEN
            ALTER TABLE interviews ADD COLUMN cancelled_at TIMESTAMP;
        END IF;
    END $$;

    -- Ajouter la colonne completed_at si elle n'existe pas
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interviews' AND column_name = 'completed_at'
        ) THEN
            ALTER TABLE interviews ADD COLUMN completed_at TIMESTAMP;
        END IF;
    END $$;

    -- Mettre à jour les entretiens existants pour avoir le statut 'planifié' par défaut
    UPDATE interviews SET status = 'planifié' WHERE status IS NULL;

    -- Ajouter une contrainte CHECK pour valider les statuts (si elle n'existe pas)
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'interviews_status_check'
        ) THEN
            ALTER TABLE interviews ADD CONSTRAINT interviews_status_check 
            CHECK (status IN ('planifié', 'réalisé', 'reporté', 'annulé'));
        END IF;
    END $$;
    """
    
    try:
        with engine.connect() as connection:
            # Exécuter chaque instruction SQL séparément
            statements = migration_sql.split(';')
            for statement in statements:
                statement = statement.strip()
                if statement and not statement.startswith('--'):
                    try:
                        connection.execute(text(statement))
                        connection.commit()
                    except Exception as e:
                        # Ignorer les erreurs si la colonne existe déjà
                        if 'already exists' not in str(e).lower() and 'duplicate' not in str(e).lower():
                            print(f"⚠️  Avertissement lors de l'exécution: {e}")
            
            print("✅ Migration appliquée avec succès!")
            return True
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        return False

if __name__ == "__main__":
    apply_migration()

