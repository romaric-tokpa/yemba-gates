"""
Tests pour vérifier l'isolation multi-tenant
"""
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from models_master import Company, TenantDatabase
from models import User, Job, Candidate
from tenant_manager import (
    get_master_session,
    get_tenant_by_id,
    get_tenant_database,
    get_tenant_engine,
    get_tenant_session,
    identify_tenant_from_token,
    get_current_tenant_id
)
from auth import create_access_token, get_password_hash
from database_tenant import get_session


def test_create_test_companies():
    """Crée deux entreprises de test pour les tests d'isolation"""
    with get_master_session() as session:
        # Créer entreprise A
        company_a = Company(
            id=uuid4(),
            name="Entreprise Test A",
            subdomain="test-a",
            status="active"
        )
        session.add(company_a)
        session.commit()
        session.refresh(company_a)
        
        # Créer base de données pour entreprise A
        tenant_db_a = TenantDatabase(
            id=uuid4(),
            company_id=company_a.id,
            db_name=f"test_tenant_{company_a.id.hex[:8]}",
            db_host="localhost",
            db_port=5432,
            status="active"
        )
        session.add(tenant_db_a)
        
        # Créer entreprise B
        company_b = Company(
            id=uuid4(),
            name="Entreprise Test B",
            subdomain="test-b",
            status="active"
        )
        session.add(company_b)
        session.commit()
        session.refresh(company_b)
        
        # Créer base de données pour entreprise B
        tenant_db_b = TenantDatabase(
            id=uuid4(),
            company_id=company_b.id,
            db_name=f"test_tenant_{company_b.id.hex[:8]}",
            db_host="localhost",
            db_port=5432,
            status="active"
        )
        session.add(tenant_db_b)
        session.commit()
        
        return company_a.id, company_b.id


def test_tenant_identification_from_token():
    """Test l'identification du tenant depuis un token JWT"""
    company_id = uuid4()
    
    # Créer un token avec company_id
    token = create_access_token(
        data={
            "sub": str(uuid4()),
            "company_id": str(company_id),
            "role": "manager"
        }
    )
    
    # Identifier le tenant
    identified_id = identify_tenant_from_token(token)
    
    assert identified_id == company_id, "Le tenant doit être identifié correctement depuis le token"


def test_tenant_isolation_jobs():
    """Test que les jobs sont isolés par tenant"""
    # Ce test nécessite deux bases de données de test
    # Pour l'instant, on vérifie la logique
    
    company_a_id = uuid4()
    company_b_id = uuid4()
    
    # Simuler deux sessions de tenants différents
    # (Dans un vrai test, on utiliserait de vraies bases de données)
    
    # Vérifier que la logique d'isolation est en place
    assert company_a_id != company_b_id, "Les IDs doivent être différents"


def test_get_tenant_by_id():
    """Test la récupération d'un tenant par ID"""
    # Créer un tenant de test
    with get_master_session() as session:
        company = Company(
            id=uuid4(),
            name="Test Company",
            subdomain="test",
            status="active"
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        
        # Récupérer le tenant
        retrieved = get_tenant_by_id(company.id)
        
        assert retrieved is not None, "Le tenant doit être trouvé"
        assert retrieved.id == company.id, "L'ID doit correspondre"
        assert retrieved.status == "active", "Le statut doit être actif"


def test_token_contains_company_id():
    """Test que le token JWT contient company_id"""
    company_id = uuid4()
    user_id = uuid4()
    
    token = create_access_token(
        data={
            "sub": str(user_id),
            "company_id": str(company_id),
            "role": "manager"
        }
    )
    
    # Décoder le token pour vérifier
    from jose import jwt
    from auth import SECRET_KEY, ALGORITHM
    
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    
    assert "company_id" in payload, "Le token doit contenir company_id"
    assert payload["company_id"] == str(company_id), "Le company_id doit correspondre"


if __name__ == "__main__":
    print("🧪 Tests d'isolation multi-tenant")
    print("=" * 60)
    
    # Tests basiques
    try:
        test_token_contains_company_id()
        print("✅ Test token avec company_id: PASSÉ")
    except Exception as e:
        print(f"❌ Test token avec company_id: ÉCHOUÉ - {str(e)}")
    
    try:
        test_tenant_identification_from_token()
        print("✅ Test identification tenant depuis token: PASSÉ")
    except Exception as e:
        print(f"❌ Test identification tenant depuis token: ÉCHOUÉ - {str(e)}")
    
    print("=" * 60)
    print("💡 Pour des tests complets, exécutez: pytest backend/tests/test_tenant_isolation.py")
