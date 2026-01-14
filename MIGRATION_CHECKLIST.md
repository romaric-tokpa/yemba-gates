# ✅ CHECKLIST DE MIGRATION - Architecture Multi-Tenant

Cette checklist guide la migration vers l'architecture multi-tenant sécurisée.

---

## 📋 PRÉREQUIS

- [ ] PostgreSQL 16+ installé et accessible
- [ ] Accès root/admin à PostgreSQL
- [ ] Backup complet de la base de données existante
- [ ] Variables d'environnement configurées

---

## 🔧 PHASE 1: Configuration Base MASTER

### Étape 1.1: Créer la base MASTER

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données master
CREATE DATABASE yemma_gates_master;

# Se connecter à la base master
\c yemma_gates_master

# Exécuter le schéma
\i backend/schema_master.sql
```

- [ ] Base `yemma_gates_master` créée
- [ ] Tables créées (companies, tenant_databases, subscriptions, plans, billing_records, platform_admins)
- [ ] Plans par défaut insérés

### Étape 1.2: Configurer les variables d'environnement

Ajouter dans `.env`:

```env
# Base MASTER
MASTER_DB_URL=postgresql://postgres:postgres@localhost:5432/yemma_gates_master

# Base par défaut (pour migration)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recrutement_db
```

- [ ] `MASTER_DB_URL` configuré
- [ ] `DATABASE_URL` configuré

---

## 🔧 PHASE 2: Créer l'Entreprise Par Défaut

### Étape 2.1: Exécuter le script de création

```bash
cd backend
python migrations/create_default_company.py
```

- [ ] Script exécuté sans erreur
- [ ] Entreprise par défaut créée dans MASTER_DB
- [ ] Base de données existante liée à l'entreprise
- [ ] ID de l'entreprise noté pour la migration

### Étape 2.2: Vérifier la création

```sql
-- Dans la base MASTER
SELECT id, name, subdomain, status FROM companies WHERE subdomain = 'default';
SELECT id, company_id, db_name, status FROM tenant_databases;
```

- [ ] Entreprise visible dans `companies`
- [ ] Base de données visible dans `tenant_databases`

---

## 🔧 PHASE 3: Migration des Données

### Étape 3.1: Ajouter company_id aux tables

```bash
# Se connecter à la base de données existante
psql -U postgres -d recrutement_db

# Exécuter la migration
\i backend/migrations/add_company_id_migration.sql
```

**IMPORTANT:** Avant d'exécuter, remplacer `COMPANY_ID_DEFAULT` dans le script SQL par l'ID réel de l'entreprise par défaut.

- [ ] Colonne `company_id` ajoutée à toutes les tables
- [ ] Index créés sur `company_id`
- [ ] Index unique composite créé pour `users(email, company_id)`

### Étape 3.2: Mettre à jour les données existantes

```sql
-- Remplacer 'YOUR_COMPANY_ID' par l'ID réel
UPDATE users SET company_id = 'YOUR_COMPANY_ID' WHERE company_id IS NULL;

-- Mettre à jour les autres tables en cascade
UPDATE jobs SET company_id = (
    SELECT company_id FROM users WHERE users.id = jobs.created_by LIMIT 1
) WHERE company_id IS NULL;

UPDATE candidates SET company_id = (
    SELECT company_id FROM users WHERE users.id = candidates.created_by LIMIT 1
) WHERE company_id IS NULL;

-- ... (voir le script SQL complet)
```

- [ ] Tous les utilisateurs ont un `company_id`
- [ ] Toutes les autres tables ont un `company_id`
- [ ] Vérification: `SELECT COUNT(*) FROM users WHERE company_id IS NULL;` retourne 0

### Étape 3.3: Rendre company_id obligatoire

**ATTENTION:** Ne faire cette étape QUE si toutes les données ont été migrées.

```sql
-- Décommenter dans add_company_id_migration.sql
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
-- ... (pour toutes les tables)
```

- [ ] `company_id` est NOT NULL sur toutes les tables

---

## 🔧 PHASE 4: Mise à Jour du Code

### Étape 4.1: Mettre à jour les imports

```bash
# Exécuter le script automatique
python backend/migrations/update_routers_for_tenant.py
```

- [ ] Script exécuté
- [ ] Tous les routers utilisent `database_tenant`

### Étape 4.2: Vérifier manuellement les routers

Vérifier que tous les routers importent:
```python
from database_tenant import get_session
```

Routers à vérifier:
- [ ] `routers/jobs.py`
- [ ] `routers/candidates.py`
- [ ] `routers/kpi.py`
- [ ] `routers/interviews.py`
- [ ] `routers/offers.py`
- [ ] `routers/notifications.py`
- [ ] `routers/onboarding.py`
- [ ] `routers/history.py`
- [ ] `routers/admin.py`
- [ ] `routers/applications.py`
- [ ] `routers/teams.py`
- [ ] `routers/shortlists.py`
- [ ] `routers/client_interview_requests.py`
- [ ] `routers/kpi_client_endpoint.py`

### Étape 4.3: Vérifier main.py

- [ ] `main.py` importe `database_tenant`
- [ ] `main.py` importe `tenant_middleware`
- [ ] Middleware tenant ajouté: `app.middleware("http")(tenant_middleware)`

### Étape 4.4: Vérifier auth.py

- [ ] `auth.py` importe `database_tenant`
- [ ] `get_current_user` vérifie le tenant
- [ ] Token JWT contient `company_id`

---

## 🔧 PHASE 5: Tests

### Étape 5.1: Test de connexion

```bash
# Démarrer le serveur
cd backend
python -m uvicorn main:app --reload

# Tester la connexion
curl http://localhost:8000/health
```

- [ ] Serveur démarre sans erreur
- [ ] Route `/health` répond

### Étape 5.2: Test d'authentification

```bash
# Tester le login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

- [ ] Login fonctionne
- [ ] Token JWT contient `company_id`
- [ ] Token peut être décodé

### Étape 5.3: Test d'isolation

```bash
# Créer deux entreprises de test
# Se connecter avec un utilisateur de l'entreprise A
# Essayer d'accéder aux données de l'entreprise B
```

- [ ] Accès cross-tenant bloqué (403 Forbidden)
- [ ] Logs montrent la tentative d'accès

### Étape 5.4: Test des endpoints

Tester les endpoints principaux:
- [ ] `GET /jobs` - Liste uniquement les jobs du tenant
- [ ] `GET /candidates` - Liste uniquement les candidats du tenant
- [ ] `GET /kpi/manager` - KPI uniquement pour le tenant
- [ ] `POST /jobs` - Création d'un job pour le tenant

---

## 🔧 PHASE 6: Optimisation (Optionnel)

### Étape 6.1: Créer les index pour les KPI

```sql
-- Index pour les requêtes KPI fréquentes
CREATE INDEX idx_applications_status_created_at ON applications(status, created_at);
CREATE INDEX idx_jobs_status_created_at ON jobs(status, created_at);
CREATE INDEX idx_candidates_created_by_status ON candidates(created_by, status);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
```

- [ ] Index créés
- [ ] Performance des KPI améliorée

### Étape 6.2: Implémenter le cache (Optionnel)

- [ ] Redis installé et configuré
- [ ] Cache implémenté pour les KPI
- [ ] TTL configuré

---

## 🚨 VÉRIFICATIONS FINALES

Avant de déployer en production:

- [ ] Tous les tests passent
- [ ] Aucune erreur dans les logs
- [ ] Isolation des données vérifiée
- [ ] Performance acceptable
- [ ] Backup récent disponible
- [ ] Plan de rollback préparé
- [ ] Documentation mise à jour

---

## 📝 NOTES IMPORTANTES

1. **Ne pas sauter d'étapes**: Suivre l'ordre des phases
2. **Tester après chaque phase**: Ne pas attendre la fin pour tester
3. **Backup régulier**: Faire un backup avant chaque modification importante
4. **Rollback**: Prévoir un plan de rollback en cas de problème

---

## 🆘 EN CAS DE PROBLÈME

### Problème: "Tenant non identifié"

**Solution:**
- Vérifier que le middleware est activé dans `main.py`
- Vérifier que le token JWT contient `company_id`
- Vérifier les logs pour voir où l'identification échoue

### Problème: "Base de données non disponible"

**Solution:**
- Vérifier que la base existe dans `tenant_databases`
- Vérifier que le statut est "active"
- Vérifier les credentials de connexion

### Problème: "Erreur de migration"

**Solution:**
- Restaurer le backup
- Vérifier les logs d'erreur
- Corriger le script de migration
- Réessayer

---

**Date de migration:** _______________

**Effectué par:** _______________

**Validé par:** _______________
