"""
Tests pour l'endpoint /api/auth/register-company
"""
import pytest
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from sqlmodel import Session, select, create_engine
from sqlalchemy import inspect

# Imports pour les tests
from main import app
from tenant_manager import get_master_session, master_engine
from models_master import Company, TenantDatabase, Plan, Subscription
from models import User
from utils.db_creator import drop_tenant_database, sanitize_db_name


client = TestClient(app)


class TestRegisterCompany:
    """Tests pour l'inscription d'entreprise"""
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup et nettoyage avant/après chaque test"""
        # Setup
        self.created_companies = []
        self.created_db_names = []
        yield
        # Teardown - Nettoyer les données créées
        self.cleanup()
    
    def cleanup(self):
        """Nettoie les données créées pendant les tests"""
        try:
            with get_master_session() as session:
                # Supprimer les entreprises créées
                for company_id in self.created_companies:
                    # Supprimer les subscriptions
                    subscriptions = session.exec(
                        select(Subscription).where(Subscription.company_id == company_id)
                    ).all()
                    for sub in subscriptions:
                        session.delete(sub)
                    
                    # Supprimer les tenant_databases
                    tenant_dbs = session.exec(
                        select(TenantDatabase).where(TenantDatabase.company_id == company_id)
                    ).all()
                    for td in tenant_dbs:
                        # Supprimer la base de données
                        try:
                            drop_tenant_database(td.db_name)
                        except:
                            pass
                        session.delete(td)
                    
                    # Supprimer l'entreprise
                    company = session.get(Company, company_id)
                    if company:
                        session.delete(company)
                
                session.commit()
        except Exception as e:
            print(f"⚠️ Erreur lors du nettoyage: {str(e)}")
    
    def test_register_company_success(self):
        """Test l'inscription réussie d'une entreprise"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"Test Company {unique_id}",
            "company_email": f"test{unique_id}@company.com",
            "company_phone": "+221 77 123 45 67",
            "country": "Sénégal",
            "industry": "Technologie",
            "company_size": "medium",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "SecurePassword123!",
            "subdomain": f"testcompany{unique_id}"
        }
        
        response = client.post("/api/auth/register-company", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Vérifier la réponse
        assert data["success"] == True
        assert data["message"] == "Entreprise créée avec succès"
        assert data["company_id"] is not None
        assert data["access_token"] is not None
        assert data["user_id"] is not None
        
        company_id = data["company_id"]
        self.created_companies.append(company_id)
        
        # Vérifier dans MASTER_DB
        with get_master_session() as session:
            company = session.get(Company, company_id)
            assert company is not None
            assert company.name == payload["company_name"]
            assert company.contact_email == payload["company_email"]
            assert company.country == payload["country"]
            assert company.industry == payload["industry"]
            assert company.size == payload["company_size"]
            assert company.subdomain == payload["subdomain"]
            assert company.status == "active"
            
            # Vérifier TenantDatabase
            tenant_db = session.exec(
                select(TenantDatabase).where(TenantDatabase.company_id == company_id)
            ).first()
            assert tenant_db is not None
            assert tenant_db.db_name.startswith("yemmagates_")
            assert tenant_db.status == "active"
            self.created_db_names.append(tenant_db.db_name)
            
            # Vérifier Subscription
            subscription = session.exec(
                select(Subscription).where(Subscription.company_id == company_id)
            ).first()
            assert subscription is not None
            assert subscription.status == "trial"
            assert subscription.plan_id is not None
            
            # Vérifier Plan
            plan = session.get(Plan, subscription.plan_id)
            assert plan is not None
            assert plan.plan_type == "free"
        
        # Vérifier dans la base tenant
        import os
        from sqlmodel import create_engine, Session as SQLSession
        
        db_user = os.getenv("POSTGRES_USER", "postgres")
        db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
        db_host = os.getenv("POSTGRES_HOST", "localhost")
        db_port = os.getenv("POSTGRES_PORT", "5432")
        
        tenant_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{tenant_db.db_name}"
        tenant_engine = create_engine(tenant_db_url)
        
        with SQLSession(tenant_engine) as tenant_session:
            # Vérifier l'utilisateur admin
            user = tenant_session.exec(
                select(User).where(User.email == payload["admin_email"])
            ).first()
            assert user is not None
            assert user.first_name == payload["admin_first_name"]
            assert user.last_name == payload["admin_last_name"]
            assert user.role == "administrateur"
            assert user.is_active == True
            assert str(user.company_id) == company_id
        
        tenant_engine.dispose()
        print(f"✅ Test réussi: Entreprise {company_id} créée avec succès")
    
    def test_register_company_duplicate_email(self):
        """Test que l'inscription échoue avec un email d'entreprise déjà utilisé"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"Test Company {unique_id}",
            "company_email": f"duplicate{unique_id}@test.com",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "SecurePassword123!"
        }
        
        # Première inscription (doit réussir)
        response1 = client.post("/api/auth/register-company", json=payload)
        assert response1.status_code == 201
        data1 = response1.json()
        self.created_companies.append(data1["company_id"])
        
        # Deuxième inscription avec le même email (doit échouer)
        payload["company_name"] = "Another Company"
        payload["admin_email"] = f"admin2{unique_id}@test.com"
        response2 = client.post("/api/auth/register-company", json=payload)
        assert response2.status_code == 400
        assert "existe déjà" in response2.json()["detail"].lower()
        
        print("✅ Test réussi: Duplication d'email détectée")
    
    def test_register_company_weak_password(self):
        """Test que l'inscription échoue avec un mot de passe trop court"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"Test Company {unique_id}",
            "company_email": f"test{unique_id}@company.com",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "short"  # Trop court
        }
        
        response = client.post("/api/auth/register-company", json=payload)
        assert response.status_code == 400
        assert "8 caractères" in response.json()["detail"]
        
        print("✅ Test réussi: Mot de passe faible rejeté")
    
    def test_register_company_auto_subdomain(self):
        """Test que le subdomain est généré automatiquement si non fourni"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"Auto Subdomain Test {unique_id}",
            "company_email": f"autosub{unique_id}@test.com",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "SecurePassword123!"
            # Pas de subdomain
        }
        
        response = client.post("/api/auth/register-company", json=payload)
        assert response.status_code == 201
        data = response.json()
        company_id = data["company_id"]
        self.created_companies.append(company_id)
        
        # Vérifier que le subdomain a été généré
        with get_master_session() as session:
            company = session.get(Company, company_id)
            assert company.subdomain is not None
            assert len(company.subdomain) >= 3
        
        print(f"✅ Test réussi: Subdomain auto-généré: {company.subdomain}")
    
    def test_register_company_database_created(self):
        """Test que la base de données est créée"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"DB Test {unique_id}",
            "company_email": f"dbtest{unique_id}@test.com",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "SecurePassword123!"
        }
        
        response = client.post("/api/auth/register-company", json=payload)
        assert response.status_code == 201
        data = response.json()
        company_id = data["company_id"]
        self.created_companies.append(company_id)
        
        # Vérifier que la base existe
        with get_master_session() as session:
            tenant_db = session.exec(
                select(TenantDatabase).where(TenantDatabase.company_id == company_id)
            ).first()
            assert tenant_db is not None
            
            # Vérifier que la base PostgreSQL existe
            import os
            from sqlalchemy import create_engine, inspect
            
            db_user = os.getenv("POSTGRES_USER", "postgres")
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db_host = os.getenv("POSTGRES_HOST", "localhost")
            db_port = os.getenv("POSTGRES_PORT", "5432")
            
            admin_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
            admin_engine = create_engine(admin_url)
            
            with admin_engine.connect() as conn:
                from sqlalchemy import text
                result = conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                    {"db_name": tenant_db.db_name}
                )
                assert result.fetchone() is not None, f"Base de données {tenant_db.db_name} n'existe pas"
            
            admin_engine.dispose()
            self.created_db_names.append(tenant_db.db_name)
        
        print(f"✅ Test réussi: Base de données {tenant_db.db_name} créée")
    
    def test_register_company_schema_applied(self):
        """Test que le schéma est appliqué dans la nouvelle base"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"Schema Test {unique_id}",
            "company_email": f"schemtest{unique_id}@test.com",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "SecurePassword123!"
        }
        
        response = client.post("/api/auth/register-company", json=payload)
        assert response.status_code == 201
        data = response.json()
        company_id = data["company_id"]
        self.created_companies.append(company_id)
        
        # Vérifier que les tables existent
        import os
        from sqlmodel import create_engine, Session as SQLSession
        
        with get_master_session() as session:
            tenant_db = session.exec(
                select(TenantDatabase).where(TenantDatabase.company_id == company_id)
            ).first()
            
            db_user = os.getenv("POSTGRES_USER", "postgres")
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db_host = os.getenv("POSTGRES_HOST", "localhost")
            db_port = os.getenv("POSTGRES_PORT", "5432")
            
            tenant_db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{tenant_db.db_name}"
            tenant_engine = create_engine(tenant_db_url)
            
            inspector = inspect(tenant_engine)
            tables = inspector.get_table_names()
            
            # Vérifier que les tables principales existent
            expected_tables = ["users", "jobs", "candidates", "applications", "interviews"]
            for table in expected_tables:
                assert table in tables, f"Table {table} n'existe pas dans la base"
            
            tenant_engine.dispose()
            self.created_db_names.append(tenant_db.db_name)
        
        print("✅ Test réussi: Schéma appliqué correctement")
    
    def test_register_company_subscription_created(self):
        """Test que la subscription est créée avec le plan FREE"""
        unique_id = uuid4().hex[:8]
        payload = {
            "company_name": f"Subscription Test {unique_id}",
            "company_email": f"subtest{unique_id}@test.com",
            "admin_first_name": "Jean",
            "admin_last_name": "Dupont",
            "admin_email": f"admin{unique_id}@test.com",
            "admin_password": "SecurePassword123!"
        }
        
        response = client.post("/api/auth/register-company", json=payload)
        assert response.status_code == 201
        data = response.json()
        company_id = data["company_id"]
        self.created_companies.append(company_id)
        
        # Vérifier la subscription
        with get_master_session() as session:
            subscription = session.exec(
                select(Subscription).where(Subscription.company_id == company_id)
            ).first()
            assert subscription is not None
            assert subscription.status == "trial"
            assert subscription.trial_ends_at is not None
            
            # Vérifier que le trial est de 30 jours
            expected_trial_end = datetime.utcnow() + timedelta(days=30)
            time_diff = abs((subscription.trial_ends_at - expected_trial_end).total_seconds())
            assert time_diff < 3600, "Trial ends_at devrait être à environ 30 jours"  # Tolérance de 1h
            
            # Vérifier le plan
            plan = session.get(Plan, subscription.plan_id)
            assert plan is not None
            assert plan.plan_type == "free"
        
        print("✅ Test réussi: Subscription créée avec plan FREE")


def run_tests():
    """Fonction pour exécuter les tests manuellement"""
    print("=" * 60)
    print("🧪 TESTS D'INSCRIPTION D'ENTREPRISE")
    print("=" * 60)
    print()
    
    test_suite = TestRegisterCompany()
    test_suite.setup_and_teardown()
    
    try:
        print("1️⃣ Test: Inscription réussie")
        test_suite.test_register_company_success()
        print()
        
        print("2️⃣ Test: Email dupliqué")
        test_suite.test_register_company_duplicate_email()
        print()
        
        print("3️⃣ Test: Mot de passe faible")
        test_suite.test_register_company_weak_password()
        print()
        
        print("4️⃣ Test: Subdomain auto-généré")
        test_suite.test_register_company_auto_subdomain()
        print()
        
        print("5️⃣ Test: Base de données créée")
        test_suite.test_register_company_database_created()
        print()
        
        print("6️⃣ Test: Schéma appliqué")
        test_suite.test_register_company_schema_applied()
        print()
        
        print("7️⃣ Test: Subscription créée")
        test_suite.test_register_company_subscription_created()
        print()
        
        print("=" * 60)
        print("✅ TOUS LES TESTS SONT PASSÉS!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERREUR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        test_suite.cleanup()


if __name__ == "__main__":
    run_tests()
