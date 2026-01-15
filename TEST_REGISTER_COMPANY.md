# 🧪 Tests de l'Inscription d'Entreprise

Guide pour tester l'endpoint `/api/auth/register-company`.

---

## 📋 Prérequis

1. ✅ Serveur backend démarré
2. ✅ Base MASTER créée (`yemma_gates_master`)
3. ✅ Variables d'environnement configurées
4. ✅ PostgreSQL accessible avec droits CREATE DATABASE

---

## 🚀 Méthode 1: Script Automatisé (Recommandé)

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/test_register_company.sh
```

Le script exécute automatiquement tous les tests et nettoie après.

---

## 🔧 Méthode 2: Tests Manuels

### Test 1: Inscription Basique

```bash
curl -X POST http://localhost:8000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Ma Société SARL",
    "company_email": "contact@masociete.com",
    "company_phone": "+221 77 123 45 67",
    "country": "Sénégal",
    "industry": "Technologie",
    "company_size": "medium",
    "admin_first_name": "Jean",
    "admin_last_name": "Dupont",
    "admin_email": "admin@masociete.com",
    "admin_password": "SecurePassword123!"
  }'
```

**Réponse attendue (201):**
```json
{
  "success": true,
  "message": "Entreprise créée avec succès",
  "company_id": "uuid",
  "redirect": "/login",
  "access_token": "jwt-token",
  "user_id": "uuid"
}
```

### Test 2: Vérifier dans MASTER_DB

```sql
-- Se connecter à la base MASTER
psql -U postgres -d yemma_gates_master

-- Vérifier l'entreprise
SELECT id, name, contact_email, subdomain, status 
FROM companies 
ORDER BY created_at DESC 
LIMIT 1;

-- Vérifier TenantDatabase
SELECT id, company_id, db_name, db_host, status 
FROM tenant_databases 
ORDER BY created_at DESC 
LIMIT 1;

-- Vérifier Subscription
SELECT s.id, s.company_id, s.status, p.name as plan_name
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
ORDER BY s.created_at DESC 
LIMIT 1;
```

### Test 3: Vérifier la Base de Données Créée

```bash
# Lister les bases PostgreSQL
psql -U postgres -lqt | grep yemmagates

# Se connecter à la base créée
# (remplacer DB_NAME par le nom réel)
psql -U postgres -d yemmagates_xxxxxxxxxxxx

# Vérifier les tables
\dt

# Vérifier l'utilisateur admin
SELECT id, email, first_name, last_name, role, company_id 
FROM users 
WHERE role = 'administrateur';
```

### Test 4: Test de Duplication (Doit Échouer)

```bash
# Essayer avec un email déjà utilisé
curl -X POST http://localhost:8000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Autre Société",
    "company_email": "contact@masociete.com",  // Email déjà utilisé
    "admin_first_name": "Marie",
    "admin_last_name": "Martin",
    "admin_email": "marie@test.com",
    "admin_password": "SecurePassword123!"
  }'
```

**Réponse attendue (400):**
```json
{
  "detail": "Une entreprise avec cet email existe déjà"
}
```

### Test 5: Test Mot de Passe Faible

```bash
curl -X POST http://localhost:8000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "company_email": "test@company.com",
    "admin_first_name": "Jean",
    "admin_last_name": "Dupont",
    "admin_email": "admin@test.com",
    "admin_password": "short"  // Trop court
  }'
```

**Réponse attendue (400):**
```json
{
  "detail": "Le mot de passe doit contenir au moins 8 caractères"
}
```

### Test 6: Vérifier le Token JWT

```bash
# Récupérer le token depuis la réponse précédente
TOKEN="your-access-token-here"

# Décoder le token (nécessite Python)
python3 -c "
from jose import jwt
import os
import sys
sys.path.insert(0, 'backend')
from auth import SECRET_KEY, ALGORITHM

token = '$TOKEN'
try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    print('✅ Token valide')
    print(f'Company ID: {payload.get(\"company_id\")}')
    print(f'User ID: {payload.get(\"sub\")}')
    print(f'Role: {payload.get(\"role\")}')
except Exception as e:
    print(f'❌ Erreur: {e}')
"
```

---

## 🧪 Méthode 3: Tests Python (Pytest)

```bash
cd /Users/tokpa/Documents/recrutement-app/backend

# Installer pytest si nécessaire
pip install pytest

# Exécuter les tests
pytest tests/test_register_company.py -v

# OU exécuter le script de test directement
python tests/test_register_company.py
```

---

## ✅ Checklist de Validation

Après chaque test, vérifier:

- [ ] Entreprise créée dans MASTER_DB (`companies`)
- [ ] TenantDatabase créé (`tenant_databases`)
- [ ] Subscription créée avec plan FREE
- [ ] Base PostgreSQL créée (`yemmagates_xxxxxxxxxxxx`)
- [ ] Tables créées dans la base tenant (users, jobs, etc.)
- [ ] Utilisateur admin créé dans la base tenant
- [ ] `company_id` présent dans l'utilisateur
- [ ] Token JWT contient `company_id`
- [ ] Rollback fonctionne (test avec erreur)

---

## 🐛 Dépannage

### Erreur: "permission denied to create database"
→ Vérifier que l'utilisateur PostgreSQL a les droits:
```sql
ALTER USER postgres CREATEDB;
```

### Erreur: "relation companies does not exist"
→ Créer la base MASTER:
```bash
psql -U postgres -c "CREATE DATABASE yemma_gates_master;"
psql -U postgres -d yemma_gates_master -f backend/schema_master.sql
```

### Erreur: "Module 'utils.db_creator' not found"
→ Vérifier que `backend/utils/__init__.py` existe

### Erreur: "connection refused"
→ Démarrer le serveur:
```bash
cd backend
python -m uvicorn main:app --reload
```

---

## 🧹 Nettoyage

Pour supprimer les données de test:

```sql
-- Dans MASTER_DB
-- (remplacer COMPANY_ID par l'ID réel)
DELETE FROM subscriptions WHERE company_id = 'COMPANY_ID'::uuid;
DELETE FROM tenant_databases WHERE company_id = 'COMPANY_ID'::uuid;
DELETE FROM companies WHERE id = 'COMPANY_ID'::uuid;

-- Supprimer la base de données
-- (remplacer DB_NAME par le nom réel)
DROP DATABASE IF EXISTS "yemmagates_xxxxxxxxxxxx";
```

---

**Bon test! 🚀**
