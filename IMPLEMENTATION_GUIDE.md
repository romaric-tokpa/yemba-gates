# 🚀 GUIDE D'IMPLÉMENTATION - Architecture Multi-Tenant

Ce guide décrit les étapes pour transformer Yemma-Gates en une plateforme SaaS multi-tenant sécurisée.

---

## 📋 PRÉREQUIS

- PostgreSQL 16+ installé
- Python 3.12+
- Accès root/admin à PostgreSQL
- Variables d'environnement configurées

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

### Étape 1.2: Configurer les variables d'environnement

Ajouter dans `.env`:

```env
# Base MASTER
MASTER_DB_URL=postgresql://postgres:postgres@localhost:5432/yemma_gates_master

# Base par défaut (pour migration)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recrutement_db
```

---

## 🔧 PHASE 2: Migration des Données Existantes

### Étape 2.1: Créer une entreprise par défaut

```python
# Script: backend/migrations/create_default_company.py
from models_master import Company, TenantDatabase, Plan, Subscription
from database_master import get_master_session
from uuid import uuid4

with get_master_session() as session:
    # Créer l'entreprise par défaut
    company = Company(
        id=uuid4(),
        name="Entreprise Par Défaut",
        subdomain="default",
        status="active"
    )
    session.add(company)
    session.commit()
    
    # Créer la base de données pour cette entreprise
    tenant_db = TenantDatabase(
        company_id=company.id,
        db_name="recrutement_db",  # Utiliser la base existante
        db_host="localhost",
        db_port=5432,
        status="active"
    )
    session.add(tenant_db)
    session.commit()
```

### Étape 2.2: Ajouter company_id aux utilisateurs existants

```sql
-- Ajouter la colonne company_id à la table users
ALTER TABLE users ADD COLUMN company_id UUID;

-- Mettre à jour tous les utilisateurs existants avec l'ID de l'entreprise par défaut
-- (Remplacer 'COMPANY_ID_DEFAULT' par l'ID réel)
UPDATE users SET company_id = 'COMPANY_ID_DEFAULT' WHERE company_id IS NULL;

-- Rendre la colonne obligatoire
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;

-- Créer un index
CREATE INDEX idx_users_company_id ON users(company_id);
```

---

## 🔧 PHASE 3: Refactorisation Auth & Database

### Étape 3.1: Modifier `auth.py`

**Modifications nécessaires:**

1. **Ajouter company_id dans le token JWT:**

```python
# Dans routers/auth.py, modifier la fonction login
@router.post("/login", response_model=Token)
async def login(...):
    user = authenticate_user(...)
    
    # Créer le token avec company_id
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "company_id": str(user.company_id)  # ✅ AJOUTER
        }
    )
```

2. **Modifier `get_current_user` pour utiliser la session tenant:**

```python
# Dans auth.py
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_tenant_session)  # ✅ CHANGER
) -> User:
    # ... reste du code
```

### Étape 3.2: Créer `database_tenant.py`

```python
# backend/database_tenant.py
from tenant_manager import get_tenant_session
from typing import Generator
from sqlmodel import Session

def get_session() -> Generator[Session, None, None]:
    """Générateur de sessions pour la base tenant"""
    session = get_tenant_session()
    try:
        yield session
    finally:
        session.close()
```

### Étape 3.3: Modifier `main.py`

**Ajouter le middleware tenant:**

```python
# Dans main.py
from tenant_manager import tenant_middleware

# Ajouter le middleware AVANT les routes
app.middleware("http")(tenant_middleware)
```

---

## 🔧 PHASE 4: Refactorisation des Modèles

### Étape 4.1: Ajouter company_id aux modèles

**Option A: Approche Shared Database (recommandé pour début)**

Ajouter `company_id` à tous les modèles métier:

```python
# Dans models.py
class User(SQLModel, table=True):
    # ... champs existants
    company_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("companies.id"), index=True))
```

**Option B: Approche Database Per Tenant (pour scalabilité)**

Chaque entreprise a sa propre base de données. Pas besoin de `company_id` dans les modèles.

### Étape 4.2: Créer les migrations

```bash
# Créer un script de migration
python backend/migrations/add_company_id_to_models.py
```

---

## 🔧 PHASE 5: Sécuriser les Endpoints

### Étape 5.1: Ajouter la vérification tenant

**Exemple pour un endpoint:**

```python
# Avant (❌ NON SÉCURISÉ)
@router.get("/jobs")
def get_jobs(session: Session = Depends(get_session)):
    jobs = session.exec(select(Job)).all()  # ❌ Retourne TOUS les jobs
    return jobs

# Après (✅ SÉCURISÉ)
@router.get("/jobs")
def get_jobs(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_tenant_session)
):
    # Le middleware a déjà vérifié le tenant
    # La session est automatiquement connectée à la bonne base
    jobs = session.exec(select(Job)).all()  # ✅ Retourne uniquement les jobs du tenant
    return jobs
```

### Étape 5.2: Vérifier l'accès aux ressources

```python
# Pour les opérations sur une ressource spécifique
@router.get("/jobs/{job_id}")
def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_tenant_session)
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Vérification supplémentaire (optionnel si DB per tenant)
    # if job.company_id != current_user.company_id:
    #     raise HTTPException(status_code=403, detail="Access denied")
    
    return job
```

---

## 🔧 PHASE 6: Optimisation KPI

### Étape 6.1: Créer les index

```sql
-- Index pour les requêtes KPI fréquentes
CREATE INDEX idx_applications_status_created_at ON applications(status, created_at);
CREATE INDEX idx_jobs_status_created_at ON jobs(status, created_at);
CREATE INDEX idx_candidates_created_by_status ON candidates(created_by, status);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
```

### Étape 6.2: Implémenter le cache (optionnel)

```python
# Installer Redis
pip install redis

# Dans kpi.py
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_kpi(key: str, ttl: int = 300):
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    return None

def set_cached_kpi(key: str, value: dict, ttl: int = 300):
    redis_client.setex(key, ttl, json.dumps(value))
```

---

## 🧪 TESTS

### Test 1: Isolation des données

```python
# Test que l'entreprise A ne peut pas accéder aux données de l'entreprise B
def test_tenant_isolation():
    # Créer deux entreprises
    company_a = create_company("Company A")
    company_b = create_company("Company B")
    
    # Créer un job pour company_a
    job_a = create_job(company_id=company_a.id)
    
    # Se connecter en tant qu'utilisateur de company_b
    token_b = login_as_user(company_b.id)
    
    # Essayer d'accéder au job de company_a
    response = get_job(job_id=job_a.id, token=token_b)
    
    # Vérifier que l'accès est refusé
    assert response.status_code == 403
```

### Test 2: Performance KPI

```python
# Test que les KPI sont calculés rapidement
def test_kpi_performance():
    start = time.time()
    kpis = get_manager_kpis()
    duration = time.time() - start
    
    # Les KPI doivent être calculés en moins de 2 secondes
    assert duration < 2.0
```

---

## 📊 MONITORING

### Métriques à surveiller

1. **Isolation:**
   - Nombre de tentatives d'accès cross-tenant
   - Erreurs 403 Forbidden

2. **Performance:**
   - Temps de réponse des KPI
   - Utilisation des connexions DB
   - Taille des bases de données

3. **Sécurité:**
   - Échecs d'authentification
   - Tokens expirés
   - Tentatives d'injection SQL

---

## 🚨 CHECKLIST DE DÉPLOIEMENT

Avant de déployer en production:

- [ ] Base MASTER créée et initialisée
- [ ] Middleware tenant activé
- [ ] Tous les endpoints utilisent `get_tenant_session`
- [ ] `company_id` ajouté dans le token JWT
- [ ] Index créés pour les KPI
- [ ] Tests d'isolation passés
- [ ] Tests de performance passés
- [ ] Monitoring configuré
- [ ] Documentation mise à jour
- [ ] Backup des bases configuré

---

## 📝 NOTES IMPORTANTES

1. **Migration progressive:** Commencer par une entreprise de test avant de migrer toutes les données

2. **Backup:** Toujours faire un backup avant de modifier le schéma

3. **Rollback:** Prévoir un plan de rollback en cas de problème

4. **Performance:** Surveiller les performances après chaque modification

5. **Sécurité:** Tester régulièrement l'isolation des données

---

## 🆘 DÉPANNAGE

### Problème: "Tenant non identifié"

**Solution:** Vérifier que:
- Le token JWT contient `company_id`
- Le middleware tenant est activé
- La base MASTER est accessible

### Problème: "Base de données non disponible"

**Solution:** Vérifier que:
- La base de données du tenant existe
- Le statut est "active" dans `tenant_databases`
- Les credentials de connexion sont corrects

### Problème: "Accès cross-tenant"

**Solution:** Vérifier que:
- Le middleware bloque bien les accès
- Les endpoints utilisent `get_tenant_session`
- Les vérifications de `company_id` sont en place

---

**Prochaine étape:** Suivre les phases dans l'ordre et tester après chaque phase.
