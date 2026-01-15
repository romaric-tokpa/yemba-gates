#!/usr/bin/env python3
"""
Test simple et rapide de l'endpoint /api/auth/register-company
"""
import sys
import requests
import json
from uuid import uuid4
from datetime import datetime

# Configuration
API_URL = "http://localhost:8000"
TIMESTAMP = datetime.now().strftime("%Y%m%d%H%M%S")
UNIQUE_ID = uuid4().hex[:8]

print("=" * 60)
print("🧪 TEST SIMPLE - INSCRIPTION D'ENTREPRISE")
print("=" * 60)
print()

# Données de test
payload = {
    "company_name": f"Test Company {TIMESTAMP}",
    "company_email": f"test{TIMESTAMP}@company.com",
    "company_phone": "+221 77 123 45 67",
    "country": "Sénégal",
    "industry": "Technologie",
    "company_size": "medium",
    "admin_first_name": "Jean",
    "admin_last_name": "Dupont",
    "admin_email": f"admin{TIMESTAMP}@test.com",
    "admin_password": "SecurePassword123!"
}

print("📤 Envoi de la requête...")
print(f"   URL: {API_URL}/api/auth/register-company")
print(f"   Company: {payload['company_name']}")
print()

try:
    response = requests.post(
        f"{API_URL}/api/auth/register-company",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    
    print(f"📥 Réponse: HTTP {response.status_code}")
    print()
    
    if response.status_code == 201:
        data = response.json()
        print("✅ SUCCÈS!")
        print()
        print("📋 Données retournées:")
        print(f"   Success: {data.get('success')}")
        print(f"   Message: {data.get('message')}")
        print(f"   Company ID: {data.get('company_id')}")
        print(f"   User ID: {data.get('user_id')}")
        print(f"   Token: {data.get('access_token', '')[:50]}...")
        print()
        
        # Sauvegarder pour vérifications
        company_id = data.get('company_id')
        if company_id:
            with open('/tmp/test_company_id.txt', 'w') as f:
                f.write(company_id)
            print(f"💾 Company ID sauvegardé: {company_id}")
            print()
        
        print("=" * 60)
        print("✅ TEST RÉUSSI!")
        print("=" * 60)
        print()
        print("💡 Prochaines vérifications:")
        print(f"   1. Vérifier dans MASTER_DB: SELECT * FROM companies WHERE id = '{company_id}';")
        print("   2. Vérifier la base créée: psql -U postgres -lqt | grep yemmagates")
        print("   3. Vérifier l'utilisateur dans la base tenant")
        
    else:
        print("❌ ÉCHEC!")
        print()
        print("📋 Réponse:")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2, ensure_ascii=False))
        except:
            print(response.text)
        
        sys.exit(1)

except requests.exceptions.ConnectionError:
    print("❌ ERREUR: Impossible de se connecter au serveur")
    print(f"   Vérifiez que le serveur est démarré sur {API_URL}")
    print("   Démarrez avec: cd backend && python -m uvicorn main:app --reload")
    sys.exit(1)

except Exception as e:
    print(f"❌ ERREUR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
