"""
Script de test pour vérifier que la migration est correcte
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select, text
from uuid import UUID
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_master_db_exists():
    """Test que la base MASTER existe et contient les tables"""
    try:
        from tenant_manager import get_master_session
        from models_master import Company, TenantDatabase, Plan
        
        with get_master_session() as session:
            # Vérifier que la table companies existe
            result = session.exec(text("SELECT COUNT(*) FROM companies")).one()
            logger.info(f"✅ Table companies existe ({result} enregistrements)")
            
            # Vérifier que la table tenant_databases existe
            result = session.exec(text("SELECT COUNT(*) FROM tenant_databases")).one()
            logger.info(f"✅ Table tenant_databases existe ({result} enregistrements)")
            
            # Vérifier que la table plans existe
            result = session.exec(text("SELECT COUNT(*) FROM plans")).one()
            logger.info(f"✅ Table plans existe ({result} enregistrements)")
            
            return True
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification de MASTER_DB: {str(e)}")
        return False


def test_default_company_exists():
    """Test que l'entreprise par défaut existe"""
    try:
        from tenant_manager import get_master_session
        from models_master import Company
        from sqlmodel import select
        
        with get_master_session() as session:
            statement = select(Company).where(Company.subdomain == "default")
            company = session.exec(statement).first()
            
            if company:
                logger.info(f"✅ Entreprise par défaut trouvée: {company.name} (ID: {company.id})")
                return company.id
            else:
                logger.warning("⚠️  Entreprise par défaut non trouvée")
                return None
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification de l'entreprise par défaut: {str(e)}")
        return None


def test_tenant_db_has_company_id():
    """Test que les tables de la base tenant ont la colonne company_id"""
    try:
        from tenant_manager import get_tenant_by_id, get_tenant_database, get_tenant_engine
        from sqlmodel import text
        
        # Récupérer l'entreprise par défaut
        company_id = test_default_company_exists()
        if not company_id:
            logger.warning("⚠️  Impossible de tester: entreprise par défaut non trouvée")
            return False
        
        # Récupérer la base de données du tenant
        tenant_db = get_tenant_database(company_id)
        if not tenant_db:
            logger.warning("⚠️  Impossible de tester: base de données tenant non trouvée")
            return False
        
        # Obtenir l'engine
        engine = get_tenant_engine(company_id)
        if not engine:
            logger.warning("⚠️  Impossible de tester: engine non disponible")
            return False
        
        # Vérifier que la colonne company_id existe dans users
        with Session(engine) as session:
            try:
                result = session.exec(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'company_id'
                """)).first()
                
                if result:
                    logger.info("✅ Colonne company_id existe dans users")
                else:
                    logger.error("❌ Colonne company_id n'existe pas dans users")
                    return False
                
                # Vérifier que tous les users ont un company_id
                result = session.exec(text("SELECT COUNT(*) FROM users WHERE company_id IS NULL")).one()
                if result == 0:
                    logger.info("✅ Tous les users ont un company_id")
                else:
                    logger.warning(f"⚠️  {result} users n'ont pas de company_id")
                
                return True
            except Exception as e:
                logger.error(f"❌ Erreur lors de la vérification: {str(e)}")
                return False
    except Exception as e:
        logger.error(f"❌ Erreur lors du test: {str(e)}")
        return False


def test_middleware_imports():
    """Test que tous les imports nécessaires fonctionnent"""
    try:
        from tenant_manager import (
            get_master_session,
            get_tenant_by_id,
            get_tenant_database,
            get_tenant_engine,
            tenant_middleware
        )
        logger.info("✅ Imports tenant_manager: OK")
        
        from database_tenant import get_session, init_db
        logger.info("✅ Imports database_tenant: OK")
        
        from models_master import Company, TenantDatabase, Plan
        logger.info("✅ Imports models_master: OK")
        
        return True
    except Exception as e:
        logger.error(f"❌ Erreur lors des imports: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_auth_includes_company_id():
    """Test que auth.py inclut company_id dans le token"""
    try:
        from uuid import uuid4
        from auth import create_access_token
        
        # Créer un token de test
        company_id = uuid4()
        token = create_access_token(
            data={
                "sub": str(uuid4()),
                "company_id": str(company_id),
                "role": "manager"
            }
        )
        
        # Décoder pour vérifier
        from jose import jwt
        from auth import SECRET_KEY, ALGORITHM
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if "company_id" in payload:
            logger.info("✅ Token JWT contient company_id")
            return True
        else:
            logger.error("❌ Token JWT ne contient pas company_id")
            return False
    except Exception as e:
        logger.error(f"❌ Erreur lors du test auth: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Fonction principale de test"""
    from uuid import uuid4
    
    print("=" * 60)
    print("🧪 TESTS DE MIGRATION - Architecture Multi-Tenant")
    print("=" * 60)
    print()
    
    results = {}
    
    # Test 1: Imports
    print("📦 Test 1: Vérification des imports...")
    results["imports"] = test_middleware_imports()
    print()
    
    # Test 2: Base MASTER
    print("🗄️  Test 2: Vérification de la base MASTER...")
    results["master_db"] = test_master_db_exists()
    print()
    
    # Test 3: Entreprise par défaut
    print("🏢 Test 3: Vérification de l'entreprise par défaut...")
    company_id = test_default_company_exists()
    results["default_company"] = company_id is not None
    print()
    
    # Test 4: Colonne company_id
    if company_id:
        print("🔍 Test 4: Vérification de la colonne company_id...")
        results["company_id_column"] = test_tenant_db_has_company_id()
        print()
    
    # Test 5: Token JWT
    print("🔐 Test 5: Vérification du token JWT...")
    results["jwt_token"] = test_auth_includes_company_id()
    print()
    
    # Résumé
    print("=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    for test_name, result in results.items():
        status = "✅ PASSÉ" if result else "❌ ÉCHOUÉ"
        print(f"  {test_name}: {status}")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    
    print()
    print(f"Total: {passed}/{total} tests passés")
    
    if passed == total:
        print("✅ Tous les tests sont passés!")
        return 0
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
