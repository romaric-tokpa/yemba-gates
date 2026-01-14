#!/usr/bin/env python3
"""
Script de vérification rapide de la configuration multi-tenant
Vérifie que tout est en place pour la migration
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

def check_environment_variables():
    """Vérifie que les variables d'environnement sont configurées"""
    print("🔍 Vérification des variables d'environnement...")
    
    required_vars = {
        "MASTER_DB_URL": "postgresql://postgres:postgres@localhost:5432/yemma_gates_master",
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/recrutement_db"
    }
    
    missing = []
    for var, default in required_vars.items():
        value = os.getenv(var, default)
        if value == default and var not in os.environ:
            print(f"   ⚠️  {var} non défini (utilise la valeur par défaut)")
        else:
            print(f"   ✅ {var} = {value[:50]}...")
    
    return True


def check_imports():
    """Vérifie que tous les imports fonctionnent"""
    print("\n📦 Vérification des imports...")
    
    imports_to_check = [
        ("tenant_manager", ["get_master_session", "get_tenant_by_id", "tenant_middleware"]),
        ("database_tenant", ["get_session", "init_db"]),
        ("models_master", ["Company", "TenantDatabase", "Plan"]),
        ("models", ["User", "Job", "Candidate"]),
        ("auth", ["create_access_token", "get_current_user"]),
    ]
    
    all_ok = True
    for module_name, items in imports_to_check:
        try:
            module = __import__(module_name, fromlist=items)
            for item in items:
                if hasattr(module, item):
                    print(f"   ✅ {module_name}.{item}")
                else:
                    print(f"   ❌ {module_name}.{item} - NON TROUVÉ")
                    all_ok = False
        except ImportError as e:
            print(f"   ❌ {module_name} - ERREUR: {str(e)}")
            all_ok = False
    
    return all_ok


def check_master_db():
    """Vérifie que la base MASTER existe et est accessible"""
    print("\n🗄️  Vérification de la base MASTER...")
    
    try:
        from tenant_manager import get_master_session
        from models_master import Company, TenantDatabase, Plan
        
        with get_master_session() as session:
            # Vérifier les tables
            from sqlmodel import text
            
            tables = ["companies", "tenant_databases", "plans", "subscriptions"]
            for table in tables:
                try:
                    result = session.exec(text(f"SELECT COUNT(*) FROM {table}")).one()
                    print(f"   ✅ Table {table} existe ({result} enregistrements)")
                except Exception as e:
                    print(f"   ❌ Table {table} - ERREUR: {str(e)}")
                    return False
            
            return True
    except Exception as e:
        print(f"   ❌ Erreur de connexion à MASTER_DB: {str(e)}")
        print("   💡 Créez la base avec: CREATE DATABASE yemma_gates_master;")
        return False


def check_default_company():
    """Vérifie que l'entreprise par défaut existe"""
    print("\n🏢 Vérification de l'entreprise par défaut...")
    
    try:
        from tenant_manager import get_master_session, get_tenant_by_id
        from models_master import Company
        from sqlmodel import select
        
        with get_master_session() as session:
            statement = select(Company).where(Company.subdomain == "default")
            company = session.exec(statement).first()
            
            if company:
                print(f"   ✅ Entreprise trouvée: {company.name}")
                print(f"      ID: {company.id}")
                print(f"      Statut: {company.status}")
                
                # Vérifier la base de données
                from tenant_manager import get_tenant_database
                tenant_db = get_tenant_database(company.id)
                if tenant_db:
                    print(f"   ✅ Base de données liée: {tenant_db.db_name}")
                    return company.id
                else:
                    print(f"   ⚠️  Base de données non trouvée")
                    return None
            else:
                print("   ⚠️  Entreprise par défaut non trouvée")
                print("   💡 Exécutez: python backend/migrations/create_default_company.py")
                return None
    except Exception as e:
        print(f"   ❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def check_tenant_db_migration(company_id):
    """Vérifie que la migration a été effectuée sur la base tenant"""
    print("\n🔍 Vérification de la migration tenant...")
    
    if not company_id:
        print("   ⚠️  Impossible de vérifier: entreprise par défaut non trouvée")
        return False
    
    try:
        from tenant_manager import get_tenant_database, get_tenant_engine
        from sqlmodel import Session, text
        
        tenant_db = get_tenant_database(company_id)
        if not tenant_db:
            print("   ⚠️  Base de données tenant non trouvée")
            return False
        
        engine = get_tenant_engine(company_id)
        if not engine:
            print("   ⚠️  Engine non disponible")
            return False
        
        with Session(engine) as session:
            # Vérifier que company_id existe dans users
            try:
                result = session.exec(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'company_id'
                """)).first()
                
                if result:
                    print("   ✅ Colonne company_id existe dans users")
                else:
                    print("   ❌ Colonne company_id n'existe pas dans users")
                    print("   💡 Exécutez: psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql")
                    return False
                
                # Vérifier les données
                null_count = session.exec(text("SELECT COUNT(*) FROM users WHERE company_id IS NULL")).one()
                if null_count == 0:
                    print("   ✅ Tous les users ont un company_id")
                else:
                    print(f"   ⚠️  {null_count} users n'ont pas de company_id")
                    print("   💡 Mettez à jour les données avec la migration SQL")
                
                return True
            except Exception as e:
                print(f"   ❌ Erreur: {str(e)}")
                return False
    except Exception as e:
        print(f"   ❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def check_code_updates():
    """Vérifie que le code a été mis à jour"""
    print("\n💻 Vérification des mises à jour du code...")
    
    checks = [
        ("backend/main.py", "tenant_middleware"),
        ("backend/auth.py", "database_tenant"),
        ("backend/routers/auth.py", "company_id"),
    ]
    
    all_ok = True
    for file_path, check_string in checks:
        full_path = Path(__file__).parent.parent / file_path
        if full_path.exists():
            content = full_path.read_text()
            if check_string in content:
                print(f"   ✅ {file_path} - Contient '{check_string}'")
            else:
                print(f"   ⚠️  {file_path} - Ne contient pas '{check_string}'")
                all_ok = False
        else:
            print(f"   ⚠️  {file_path} - Fichier non trouvé")
            all_ok = False
    
    return all_ok


def main():
    """Fonction principale"""
    print("=" * 70)
    print("🔍 VÉRIFICATION DE LA CONFIGURATION MULTI-TENANT")
    print("=" * 70)
    print()
    
    results = {}
    
    # Vérifications
    results["env_vars"] = check_environment_variables()
    results["imports"] = check_imports()
    results["master_db"] = check_master_db()
    company_id = check_default_company()
    results["default_company"] = company_id is not None
    
    if company_id:
        results["tenant_migration"] = check_tenant_db_migration(company_id)
    else:
        results["tenant_migration"] = False
    
    results["code_updates"] = check_code_updates()
    
    # Résumé
    print("\n" + "=" * 70)
    print("📊 RÉSUMÉ")
    print("=" * 70)
    
    for check_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"  {status} {check_name}")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    
    print()
    print(f"Total: {passed}/{total} vérifications réussies")
    
    if passed == total:
        print("\n✅ Tous les prérequis sont en place!")
        print("💡 Vous pouvez maintenant tester l'application")
        return 0
    else:
        print("\n⚠️  Certaines vérifications ont échoué")
        print("💡 Consultez les messages ci-dessus pour corriger les problèmes")
        return 1


if __name__ == "__main__":
    sys.exit(main())
