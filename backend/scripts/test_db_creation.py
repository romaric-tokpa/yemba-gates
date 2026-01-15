#!/usr/bin/env python3
"""
Script de test pour diagnostiquer la création de base de données
"""
import os
import sys
from pathlib import Path

# Ajouter le backend au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.db_creator import create_tenant_database, sanitize_db_name
from sqlalchemy import create_engine, text
import logging

# Configurer les logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("=" * 60)
print("🧪 TEST DE CRÉATION DE BASE DE DONNÉES")
print("=" * 60)
print()

# Vérifier les variables d'environnement
db_user = os.getenv("POSTGRES_USER", "postgres")
db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
db_host = os.getenv("POSTGRES_HOST", "localhost")
db_port = os.getenv("POSTGRES_PORT", "5432")

print("📋 Configuration PostgreSQL:")
print(f"   User: {db_user}")
print(f"   Host: {db_host}:{db_port}")
print(f"   Password: {'*' * len(db_password) if db_password else 'Non défini'}")
print()

# Test 1: Vérifier la connexion à PostgreSQL
print("🔍 TEST 1: Connexion à PostgreSQL...")
try:
    admin_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✅ Connexion réussie")
        print(f"   Version: {version.split(',')[0]}")
    
    engine.dispose()
except Exception as e:
    print(f"❌ Échec de connexion: {str(e)}")
    sys.exit(1)

print()

# Test 2: Vérifier les droits de création de base
print("🔍 TEST 2: Vérification des droits de création...")
try:
    admin_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    
    with engine.connect() as conn:
        # Vérifier si l'utilisateur peut créer des bases
        result = conn.execute(text("""
            SELECT 
                rolname, 
                rolcreatedb 
            FROM pg_roles 
            WHERE rolname = :username
        """), {"username": db_user})
        
        row = result.fetchone()
        if row:
            can_create = row[1]
            if can_create:
                print(f"✅ L'utilisateur '{db_user}' a les droits de créer des bases")
            else:
                print(f"❌ L'utilisateur '{db_user}' N'A PAS les droits de créer des bases")
                print(f"   💡 Exécutez: ALTER USER {db_user} CREATEDB;")
                sys.exit(1)
        else:
            print(f"⚠️  Utilisateur '{db_user}' non trouvé")
    
    engine.dispose()
except Exception as e:
    print(f"❌ Erreur lors de la vérification des droits: {str(e)}")
    sys.exit(1)

print()

# Test 3: Test de création d'une base de test
print("🔍 TEST 3: Création d'une base de test...")
test_db_name = "yemmagates_test_" + os.urandom(4).hex()
sanitized = sanitize_db_name(test_db_name)
print(f"   Nom de la base: {sanitized}")

success, error_msg = create_tenant_database(sanitized)

if success:
    print(f"✅ Base de test créée avec succès: {sanitized}")
    
    # Nettoyer - supprimer la base de test
    print()
    print("🧹 Nettoyage: Suppression de la base de test...")
    try:
        from utils.db_creator import drop_tenant_database
        if drop_tenant_database(sanitized):
            print(f"✅ Base de test supprimée: {sanitized}")
        else:
            print(f"⚠️  Impossible de supprimer la base de test: {sanitized}")
            print(f"   Supprimez-la manuellement: DROP DATABASE \"{sanitized}\";")
    except Exception as e:
        print(f"⚠️  Erreur lors de la suppression: {str(e)}")
        print(f"   Supprimez-la manuellement: DROP DATABASE \"{sanitized}\";")
else:
    print(f"❌ Échec de création: {error_msg}")
    sys.exit(1)

print()
print("=" * 60)
print("✅ TOUS LES TESTS SONT PASSÉS!")
print("=" * 60)
print()
print("💡 Si les tests passent mais que l'inscription échoue encore,")
print("   vérifiez les logs du serveur pour plus de détails.")
