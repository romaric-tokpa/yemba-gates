"""
Script pour créer une entreprise par défaut dans la base MASTER
et lier la base de données existante à cette entreprise
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from uuid import uuid4
from sqlmodel import Session, select
from models_master import Company, TenantDatabase
from tenant_manager import get_master_session

# Importer les modèles pour que SQLModel les enregistre
# Cela évite les problèmes de résolution de relations
import models_master

# Configuration
DEFAULT_COMPANY_NAME = "Entreprise Par Défaut"
DEFAULT_SUBDOMAIN = "default"
DEFAULT_DB_NAME = "recrutement_db"  # Nom de la base existante
DEFAULT_DB_HOST = os.getenv("DB_HOST", "localhost")
DEFAULT_DB_PORT = int(os.getenv("DB_PORT", "5432"))


def create_default_company():
    """Crée une entreprise par défaut et lie la base existante"""
    print("🚀 Création de l'entreprise par défaut...")
    
    try:
        with get_master_session() as session:
            from sqlmodel import select
            
            # Vérifier si l'entreprise existe déjà
            statement = select(Company).where(Company.subdomain == DEFAULT_SUBDOMAIN)
            existing_company = session.exec(statement).first()
            
            if existing_company:
                print(f"⚠️  L'entreprise '{DEFAULT_COMPANY_NAME}' existe déjà (ID: {existing_company.id})")
                company = existing_company
            else:
                # Créer l'entreprise
                company = Company(
                    id=uuid4(),
                    name=DEFAULT_COMPANY_NAME,
                    subdomain=DEFAULT_SUBDOMAIN,
                    status="active"
                )
                session.add(company)
                session.commit()
                session.refresh(company)
                print(f"✅ Entreprise créée: {company.name} (ID: {company.id})")
            
            # Vérifier si la base de données est déjà liée
            statement = select(TenantDatabase).where(TenantDatabase.company_id == company.id)
            existing_db = session.exec(statement).first()
            
            if existing_db:
                print(f"⚠️  La base de données est déjà liée (DB: {existing_db.db_name})")
            else:
                # Créer l'entrée de base de données
                tenant_db = TenantDatabase(
                    id=uuid4(),
                    company_id=company.id,
                    db_name=DEFAULT_DB_NAME,
                    db_host=DEFAULT_DB_HOST,
                    db_port=DEFAULT_DB_PORT,
                    status="active"
                )
                session.add(tenant_db)
                session.commit()
                print(f"✅ Base de données liée: {tenant_db.db_name} (Host: {tenant_db.db_host}:{tenant_db.db_port})")
            
            print("\n" + "=" * 60)
            print("📋 Informations de l'entreprise par défaut:")
            print(f"   ID: {company.id}")
            print(f"   Nom: {company.name}")
            print(f"   Sous-domaine: {company.subdomain}")
            print(f"   Base de données: {DEFAULT_DB_NAME}")
            print("=" * 60)
            print("\n💡 Utilisez cet ID pour mettre à jour les données existantes:")
            print(f"   UPDATE users SET company_id = '{company.id}' WHERE company_id IS NULL;")
            print("\n✅ Configuration terminée!")
            
            return company.id
            
    except Exception as e:
        print(f"❌ Erreur lors de la création: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("🔧 Script de création de l'entreprise par défaut")
    print("=" * 60)
    print()
    
    # Vérifier que MASTER_DB_URL est configuré
    if not os.getenv("MASTER_DB_URL"):
        print("⚠️  MASTER_DB_URL n'est pas configuré dans les variables d'environnement")
        print("   Utilisation de la valeur par défaut: postgresql://postgres:postgres@localhost:5432/yemma_gates_master")
        print()
    
    company_id = create_default_company()
    
    if company_id:
        print(f"\n✅ Entreprise par défaut créée avec succès (ID: {company_id})")
        sys.exit(0)
    else:
        print("\n❌ Échec de la création de l'entreprise par défaut")
        sys.exit(1)
