# ⚡ TEST RAPIDE - Inscription d'Entreprise

Guide rapide pour tester l'endpoint `/api/auth/register-company`.

---

## 🚀 Test Rapide (1 minute)

### 1. Démarrer le serveur

```bash
cd /Users/tokpa/Documents/recrutement-app/backend
python3 -m uvicorn main:app --reload
```

### 2. Dans un autre terminal, exécuter le test

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/scripts/test_register_simple.py
```

OU avec curl:

```bash
curl -X POST http://localhost:8000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "company_email": "test@company.com",
    "admin_first_name": "Jean",
    "admin_last_name": "Dupont",
    "admin_email": "admin@test.com",
    "admin_password": "SecurePassword123!"
  }' | python3 -m json.tool
```

---

## ✅ Vérification Rapide

### Vérifier dans PostgreSQL:

```sql
-- 1. Liste des bases créées
psql -U postgres -lqt | grep yemmagates

-- 2. Entreprises créées
psql -U postgres -d yemma_gates_master -c "SELECT name, contact_email, subdomain FROM companies ORDER BY created_at DESC LIMIT 5;"

-- 3. Bases tenant
psql -U postgres -d yemma_gates_master -c "SELECT db_name, company_id, status FROM tenant_databases ORDER BY created_at DESC LIMIT 5;"
```

---

## 🧹 Nettoyage Rapide

```bash
# Supprimer la dernière entreprise créée (remplacer COMPANY_ID)
COMPANY_ID="uuid-de-l-entreprise"

# Dans PostgreSQL
psql -U postgres -d yemma_gates_master -c "
  SELECT db_name INTO TEMP TABLE temp_db FROM tenant_databases WHERE company_id = '$COMPANY_ID'::uuid;
  DELETE FROM subscriptions WHERE company_id = '$COMPANY_ID'::uuid;
  DELETE FROM tenant_databases WHERE company_id = '$COMPANY_ID'::uuid;
  DELETE FROM companies WHERE id = '$COMPANY_ID'::uuid;
  SELECT db_name FROM temp_db;
" | grep yemmagates | xargs -I {} psql -U postgres -c "DROP DATABASE IF EXISTS \"{}\";"
```

---

**C'est tout! 🎉**
