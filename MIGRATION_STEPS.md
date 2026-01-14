# 🚀 ÉTAPES DE MIGRATION - Guide Complet

Guide pas à pas pour exécuter la migration vers l'architecture multi-tenant.

---

## ⚠️ AVANT DE COMMENCER

1. **Faire un backup complet** de votre base de données:
   ```bash
   pg_dump -U postgres recrutement_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Vérifier les prérequis:**
   - PostgreSQL 16+ installé et accessible
   - Python 3.12+ installé
   - Variables d'environnement configurées

---

## 📝 ÉTAPE 1: Créer la Base MASTER

### Commande à exécuter:

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans psql, exécuter:
CREATE DATABASE yemma_gates_master;
\c yemma_gates_master
\i backend/schema_master.sql
\q
```

**OU en une seule commande:**

```bash
psql -U postgres -c "CREATE DATABASE yemma_gates_master;"
psql -U postgres -d yemma_gates_master -f backend/schema_master.sql
```

### Vérification:

```sql
-- Se connecter à la base MASTER
psql -U postgres -d yemma_gates_master

-- Vérifier les tables
\dt

-- Devrait afficher: companies, tenant_databases, plans, subscriptions, billing_records, platform_admins

-- Vérifier les plans
SELECT name, plan_type, max_users FROM plans;

-- Devrait afficher 4 plans: Free, Basic, Professional, Enterprise
```

**✅ Si tout est OK, passez à l'étape 2.**

---

## 📝 ÉTAPE 2: Créer l'Entreprise Par Défaut

### Commande à exécuter:

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/migrations/create_default_company.py
```

**OU si python3 n'est pas disponible:**

```bash
python backend/migrations/create_default_company.py
```

### Sortie attendue:

```
============================================================================
🔧 Script de création de l'entreprise par défaut
============================================================================

🚀 Création de l'entreprise par défaut...
✅ Entreprise créée: Entreprise Par Défaut (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
✅ Base de données liée: recrutement_db (Host: localhost:5432)

============================================================
📋 Informations de l'entreprise par défaut:
   ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Nom: Entreprise Par Défaut
   Sous-domaine: default
   Base de données: recrutement_db
============================================================

✅ Entreprise par défaut créée avec succès
```

**⚠️ IMPORTANT: Noter l'ID de l'entreprise affiché!**

### Vérification:

```sql
-- Dans la base MASTER
psql -U postgres -d yemma_gates_master

SELECT id, name, subdomain, status FROM companies WHERE subdomain = 'default';
SELECT id, company_id, db_name, status FROM tenant_databases;
```

**✅ Si tout est OK, passez à l'étape 3.**

---

## 📝 ÉTAPE 3: Migrer les Données

### Option A: Script Python (Recommandé - Automatique)

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/migrations/migrate_data_with_company_id.py
```

Le script va:
1. Récupérer automatiquement l'ID de l'entreprise par défaut
2. Ajouter `company_id` à toutes les tables
3. Mettre à jour tous les enregistrements
4. Vérifier que tout est correct

### Option B: Script SQL (Manuel)

**3.1. D'abord, ajouter les colonnes:**

```bash
psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql
```

**3.2. Ensuite, mettre à jour les données:**

1. Récupérer l'ID de l'entreprise:
   ```sql
   psql -U postgres -d yemma_gates_master -t -c "SELECT id FROM companies WHERE subdomain = 'default';"
   ```

2. Éditer le script SQL et remplacer `COMPANY_ID_DEFAULT` par l'ID réel

3. Décommenter les lignes UPDATE dans `add_company_id_migration.sql`

4. Exécuter:
   ```bash
   psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql
   ```

### Vérification:

```sql
-- Vérifier que tous les users ont un company_id
psql -U postgres -d recrutement_db -c "SELECT COUNT(*) FROM users WHERE company_id IS NULL;"
-- Doit retourner: 0

-- Vérifier la distribution
psql -U postgres -d recrutement_db -c "SELECT company_id, COUNT(*) FROM users GROUP BY company_id;"
-- Doit afficher une seule ligne avec votre company_id
```

**✅ Si tout est OK, passez à l'étape 4.**

---

## 📝 ÉTAPE 4: Mettre à Jour les Routers

### Commande à exécuter:

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/migrations/update_routers_for_tenant.py
```

### Sortie attendue:

```
🔄 Mise à jour des routers pour le support multi-tenant...
============================================================
✅ Mis à jour: backend/routers/interviews.py
✅ Mis à jour: backend/routers/offers.py
...
============================================================
✅ X fichier(s) mis à jour
```

### Vérification:

```bash
# Vérifier qu'aucun router n'utilise encore 'database'
grep -r "from database import get_session" backend/routers/
# Ne doit rien retourner

# Vérifier que tous utilisent 'database_tenant'
grep -r "from database_tenant import get_session" backend/routers/
# Doit retourner plusieurs fichiers
```

**✅ Si tout est OK, passez à l'étape 5.**

---

## 📝 ÉTAPE 5: Optimiser les KPI (Optionnel mais Recommandé)

### Commande à exécuter:

```bash
psql -U postgres -d recrutement_db -f backend/migrations/optimize_kpi_indexes.sql
```

### Vérification:

```sql
-- Vérifier les index créés
psql -U postgres -d recrutement_db -c "
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND (indexname LIKE '%company_id%' OR indexname LIKE '%status%' OR indexname LIKE '%created_at%')
ORDER BY tablename, indexname;
"
```

**✅ Si tout est OK, passez aux tests.**

---

## 🧪 TESTS FINAUX

### Test 1: Vérifier les imports Python

```bash
cd /Users/tokpa/Documents/recrutement-app/backend
python3 -c "
from tenant_manager import get_master_session
from database_tenant import get_session
from models_master import Company
print('✅ Tous les imports fonctionnent')
"
```

### Test 2: Exécuter les tests de migration

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/tests/test_migration.py
```

### Test 3: Démarrer le serveur

```bash
cd /Users/tokpa/Documents/recrutement-app/backend
python3 -m uvicorn main:app --reload
```

Dans un autre terminal, tester:
```bash
curl http://localhost:8000/health
# Devrait retourner: {"status":"healthy"}
```

### Test 4: Tester l'authentification

```bash
# Remplacer avec vos credentials
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "votre-email@example.com", "password": "votre-mot-de-passe"}'
```

**Vérifier que le token contient `company_id`** (voir TEST_MIGRATION.md)

---

## 🎯 SCRIPT AUTOMATISÉ (Alternative)

Si vous préférez tout faire en une fois:

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/run_migration.sh
```

Le script va vous guider étape par étape avec des confirmations.

---

## ✅ CHECKLIST FINALE

- [ ] Base MASTER créée (`yemma_gates_master`)
- [ ] Tables MASTER créées (companies, tenant_databases, etc.)
- [ ] Entreprise par défaut créée
- [ ] Base de données liée à l'entreprise
- [ ] Colonne `company_id` ajoutée à toutes les tables
- [ ] Tous les enregistrements ont un `company_id`
- [ ] Tous les routers utilisent `database_tenant`
- [ ] Index KPI créés (optionnel)
- [ ] Serveur démarre sans erreur
- [ ] Authentification fonctionne
- [ ] Token JWT contient `company_id`

---

## 🆘 EN CAS DE PROBLÈME

Consultez `TEST_MIGRATION.md` pour le dépannage détaillé.

**Problèmes courants:**
- PostgreSQL non accessible → Vérifier que le serveur est démarré
- Permission denied → Utiliser `sudo` ou vérifier les droits
- Module not found → Installer les dépendances: `pip install -r backend/requirements.txt`

---

**Bonne migration! 🚀**
