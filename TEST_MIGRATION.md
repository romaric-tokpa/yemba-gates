# 🧪 GUIDE DE TEST DE LA MIGRATION

Ce guide vous aide à tester la migration étape par étape.

---

## 📋 PRÉREQUIS

Avant de commencer, assurez-vous que:
- [ ] PostgreSQL est installé et accessible
- [ ] Vous avez les droits d'administration PostgreSQL
- [ ] Un backup de la base `recrutement_db` a été fait
- [ ] Les variables d'environnement sont configurées

---

## 🚀 MÉTHODE 1: Script Automatisé (Recommandé)

### Exécuter le script complet

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/run_migration.sh
```

Le script va:
1. ✅ Créer la base MASTER
2. ✅ Créer l'entreprise par défaut
3. ✅ Migrer les données
4. ✅ Mettre à jour les routers
5. ✅ Optimiser les index (optionnel)

---

## 🔧 MÉTHODE 2: Étapes Manuelles

### Étape 1: Créer la base MASTER

```bash
# Vérifier que PostgreSQL est accessible
psql -U postgres -c "SELECT version();"

# Créer la base MASTER
psql -U postgres -c "CREATE DATABASE yemma_gates_master;"

# Exécuter le schéma
psql -U postgres -d yemma_gates_master -f backend/schema_master.sql
```

**Vérification:**
```sql
-- Se connecter à la base MASTER
psql -U postgres -d yemma_gates_master

-- Vérifier les tables
\dt

-- Vérifier les plans
SELECT name, plan_type, max_users FROM plans;
```

### Étape 2: Créer l'entreprise par défaut

```bash
cd /Users/tokpa/Documents/recrutement-app
python backend/migrations/create_default_company.py
```

**Vérification:**
```sql
-- Dans la base MASTER
SELECT id, name, subdomain, status FROM companies WHERE subdomain = 'default';
SELECT id, company_id, db_name, status FROM tenant_databases;
```

**Noter l'ID de l'entreprise** (affiché dans la sortie du script).

### Étape 3: Migrer les données

**Option A: Script Python (Recommandé)**

```bash
python backend/migrations/migrate_data_with_company_id.py
```

**Option B: Script SQL manuel**

1. Éditer `backend/migrations/add_company_id_migration.sql`
2. Remplacer `COMPANY_ID_DEFAULT` par l'ID réel de l'entreprise
3. Exécuter:
```bash
psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql
```

**Vérification:**
```sql
-- Vérifier que tous les users ont un company_id
SELECT COUNT(*) FROM users WHERE company_id IS NULL;
-- Doit retourner 0

-- Vérifier la distribution
SELECT company_id, COUNT(*) FROM users GROUP BY company_id;
```

### Étape 4: Mettre à jour les routers

```bash
python backend/migrations/update_routers_for_tenant.py
```

**Vérification:**
```bash
# Vérifier que les imports ont été mis à jour
grep -r "from database import get_session" backend/routers/
# Ne doit rien retourner

grep -r "from database_tenant import get_session" backend/routers/
# Doit retourner plusieurs fichiers
```

### Étape 5: Optimiser les KPI (Optionnel)

```bash
psql -U postgres -d recrutement_db -f backend/migrations/optimize_kpi_indexes.sql
```

**Vérification:**
```sql
-- Vérifier les index créés
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE '%company_id%' 
ORDER BY tablename;
```

---

## 🧪 TESTS DE VALIDATION

### Test 1: Vérifier les imports

```bash
cd backend
python -c "from tenant_manager import get_master_session; from database_tenant import get_session; print('✅ Imports OK')"
```

### Test 2: Vérifier la base MASTER

```bash
python backend/tests/test_migration.py
```

### Test 3: Tester le serveur

```bash
cd backend
python -m uvicorn main:app --reload
```

Dans un autre terminal:
```bash
# Tester la route health
curl http://localhost:8000/health

# Devrait retourner: {"status":"healthy"}
```

### Test 4: Tester l'authentification

```bash
# Se connecter (remplacer les credentials)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "votre-email@example.com", "password": "votre-mot-de-passe"}'
```

**Vérifier que le token contient `company_id`:**
```bash
# Décoder le token (remplacer YOUR_TOKEN)
python -c "
from jose import jwt
from auth import SECRET_KEY, ALGORITHM
token = 'YOUR_TOKEN'
payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
print('Company ID:', payload.get('company_id'))
"
```

### Test 5: Tester l'isolation

1. Créer deux entreprises de test dans MASTER_DB
2. Créer un utilisateur dans chaque entreprise
3. Se connecter avec l'utilisateur de l'entreprise A
4. Essayer d'accéder aux données de l'entreprise B
5. Vérifier que l'accès est bloqué (403 Forbidden)

---

## 🐛 DÉPANNAGE

### Erreur: "database yemma_gates_master does not exist"

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE yemma_gates_master;"
```

### Erreur: "relation companies does not exist"

**Solution:**
```bash
psql -U postgres -d yemma_gates_master -f backend/schema_master.sql
```

### Erreur: "Tenant non identifié"

**Vérifier:**
1. Le middleware est activé dans `main.py`
2. Le token JWT contient `company_id`
3. La base MASTER est accessible

### Erreur: "column company_id does not exist"

**Solution:**
Exécuter la migration SQL:
```bash
psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql
```

### Erreur: "ImportError: cannot import name 'get_session' from 'database_tenant'"

**Solution:**
Vérifier que `database_tenant.py` existe et contient `get_session()`.

---

## ✅ CHECKLIST FINALE

Avant de considérer la migration comme terminée:

- [ ] Base MASTER créée et initialisée
- [ ] Entreprise par défaut créée
- [ ] Toutes les tables ont la colonne `company_id`
- [ ] Tous les enregistrements ont un `company_id`
- [ ] Tous les routers utilisent `database_tenant`
- [ ] Le serveur démarre sans erreur
- [ ] L'authentification fonctionne
- [ ] Le token JWT contient `company_id`
- [ ] Les endpoints retournent uniquement les données du tenant
- [ ] Les tests d'isolation passent

---

## 📞 SUPPORT

En cas de problème:
1. Vérifier les logs du serveur
2. Consulter `AUDIT_REPORT.md` pour les détails techniques
3. Consulter `IMPLEMENTATION_GUIDE.md` pour les solutions
