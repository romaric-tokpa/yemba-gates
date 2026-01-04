#!/usr/bin/env python3
"""
Script pour appliquer la migration qui ajoute la colonne notes à la table interviews
"""
import os
import sys
import psycopg2
from psycopg2 import sql

# Configuration de la base de données depuis les variables d'environnement
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'recrutement_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

def apply_migration():
    """Applique la migration pour ajouter la colonne notes"""
    try:
        # Connexion à la base de données
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Lire le fichier SQL
        migration_file = os.path.join(os.path.dirname(__file__), 'add_notes_to_interviews.sql')
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Exécuter la migration
        print(f"Application de la migration: {migration_file}")
        cursor.execute(migration_sql)
        
        print("✅ Migration appliquée avec succès!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erreur lors de l'application de la migration: {e}")
        sys.exit(1)

if __name__ == '__main__':
    apply_migration()
