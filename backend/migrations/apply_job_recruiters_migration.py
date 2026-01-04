"""
Script pour créer la table job_recruiters
Permet d'attribuer plusieurs recruteurs à un besoin de recrutement
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def apply_migration():
    """Applique la migration pour créer la table job_recruiters"""
    migration_file = Path(__file__).parent / "create_job_recruiters_table.sql"
    
    if not migration_file.exists():
        print(f"❌ Fichier de migration non trouvé: {migration_file}")
        return False
    
    try:
        with engine.connect() as conn:
            # Lire le fichier SQL
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Exécuter la migration
            conn.execute(text(sql_content))
            conn.commit()
            
            print("✅ Migration appliquée avec succès: création de la table job_recruiters")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)

