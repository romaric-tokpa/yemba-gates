# 🚀 EXÉCUTER LA MIGRATION - Guide Pratique

Guide pratique pour exécuter la migration étape par étape.

---

## ⚡ MÉTHODE RAPIDE (Script Automatisé)

```bash
cd /Users/tokpa/Documents/recrutement-app
./backend/scripts/run_migration.sh
```

Le script vous guidera étape par étape avec des confirmations.

---

## 📝 MÉTHODE MANUELLE (Étape par Étape)

### ÉTAPE 1: Créer la Base MASTER

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans psql:
CREATE DATABASE yemma_gates_master;
\c yemma_gates_master
\i /Users/tokpa/Documents/recrutement-app/backend/schema_master.sql
\q
```

**Vérification:**
```sql
\dt
-- Doit afficher: companies, tenant_databases, plans, subscriptions, billing_records, platform_admins
```

### ÉTAPE 2: Créer l'Entreprise Par Défaut

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/migrations/create_default_company.py
```

**⚠️ IMPORTANT: Noter l'ID de l'entreprise affiché!**

### ÉTAPE 3: Migrer les Données

**Option A: Script Python (Recommandé)**

```bash
python3 backend/migrations/migrate_data_with_company_id.py
```

**Option B: SQL Manuel**

1. Récupérer l'ID de l'entreprise:
   ```sql
   psql -U postgres -d yemma_gates_master -t -c "SELECT id FROM companies WHERE subdomain = 'default';"
   ```

2. Éditer `backend/migrations/add_company_id_migration.sql` et remplacer `COMPANY_ID_DEFAULT`

3. Exécuter:
   ```bash
   psql -U postgres -d recrutement_db -f backend/migrations/add_company_id_migration.sql
   ```

### ÉTAPE 4: Mettre à Jour les Routers

```bash
python3 backend/migrations/update_routers_for_tenant.py
```

**Note:** Les routers ont déjà été mis à jour manuellement, mais ce script vérifie qu'il n'en reste pas.

### ÉTAPE 5: Optimiser les KPI (Optionnel)

```bash
psql -U postgres -d recrutement_db -f backend/migrations/optimize_kpi_indexes.sql
```

---

## 🧪 TESTS

### Test 1: Vérifier les Imports

```bash
cd /Users/tokpa/Documents/recrutement-app/backend
python3 -c "
from tenant_manager import get_master_session
from database_tenant import get_session
from models_master import Company
print('✅ Tous les imports fonctionnent')
"
```

### Test 2: Tests de Migration

```bash
cd /Users/tokpa/Documents/recrutement-app
python3 backend/tests/test_migration.py
```

### Test 3: Démarrer le Serveur

```bash
cd /Users/tokpa/Documents/recrutement-app/backend
python3 -m uvicorn main:app --reload
```

**Vérifier:**
- Pas d'erreurs au démarrage
- Route `/health` accessible
- Logs montrent que le middleware tenant est actif

### Test 4: Tester l'Authentification

```bash
# Tester le login (remplacer avec vos credentials)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "votre-email@example.com", "password": "votre-mot-de-passe"}'
```

**Vérifier que le token contient `company_id`** (voir ci-dessous)

### Test 5: Vérifier le Token JWT

```bash
# Décoder le token (remplacer YOUR_TOKEN)
python3 -c "
from jose import jwt
import os
import sys
sys.path.insert(0, 'backend')
from auth import SECRET_KEY, ALGORITHM

token = 'YOUR_TOKEN'
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

## ✅ CHECKLIST DE VALIDATION

Après chaque étape, cocher:

### Après Étape 1:
- [ ] Base `yemma_gates_master` créée
- [ ] 6 tables créées (companies, tenant_databases, plans, subscriptions, billing_records, platform_admins)
- [ ] 4 plans insérés (Free, Basic, Professional, Enterprise)

### Après Étape 2:
- [ ] Entreprise par défaut créée
- [ ] ID de l'entreprise noté
- [ ] Base de données liée dans `tenant_databases`

### Après Étape 3:
- [ ] Colonne `company_id` ajoutée à toutes les tables
- [ ] Tous les `users` ont un `company_id`
- [ ] Vérification: `SELECT COUNT(*) FROM users WHERE company_id IS NULL;` retourne 0

### Après Étape 4:
- [ ] Tous les routers utilisent `database_tenant`
- [ ] Aucun router n'utilise `database` (sauf pour compatibilité)

### Après Étape 5:
- [ ] Index créés (optionnel)
- [ ] Performance améliorée

### Tests Finaux:
- [ ] Serveur démarre sans erreur
- [ ] Authentification fonctionne
- [ ] Token JWT contient `company_id`
- [ ] Endpoints retournent uniquement les données du tenant

---

## 🐛 PROBLÈMES COURANTS

### "database yemma_gates_master does not exist"
→ Exécuter l'étape 1

### "relation companies does not exist"
→ Exécuter le schéma SQL dans l'étape 1

### "Tenant non identifié"
→ Vérifier que l'entreprise par défaut existe (étape 2)

### "column company_id does not exist"
→ Exécuter l'étape 3 (migration SQL)

### "ImportError: cannot import name 'get_session'"
→ Vérifier que `database_tenant.py` existe et contient `get_session()`

---

## 📞 AIDE

Si vous rencontrez un problème:
1. Consulter les logs du serveur
2. Vérifier `TEST_MIGRATION.md` pour le dépannage
3. Exécuter `python3 backend/tests/test_migration.py` pour diagnostiquer

---

**Bon courage avec la migration! 🚀**
