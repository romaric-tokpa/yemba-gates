#!/usr/bin/env python3
"""
Script pour appliquer la migration qui augmente la taille du champ phone
dans la table candidates de VARCHAR(30) à VARCHAR(100).
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour importer database
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine
from sqlalchemy import text

def apply_migration():
    """Applique la migration pour augmenter la taille du champ phone"""
    try:
        with engine.connect() as conn:
            # Lire le fichier SQL
            sql_file = Path(__file__).parent / "increase_candidate_phone_length.sql"
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Exécuter la migration
            print("🔧 Application de la migration pour augmenter la taille du champ phone...")
            conn.execute(text(sql_content))
            conn.commit()
            print("✅ Migration appliquée avec succès!")
            print("   Le champ phone peut maintenant accepter jusqu'à 100 caractères.")
            return True
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)

