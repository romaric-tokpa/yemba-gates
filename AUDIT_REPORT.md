# 🔍 RAPPORT D'AUDIT - Yemma-Gates SaaS Platform

**Date**: 2026-01-13  
**Auditeur**: Senior Software Architect  
**Version**: 1.0

---

## 📋 EXECUTIVE SUMMARY

L'audit révèle que la plateforme **n'est PAS prête pour une utilisation SaaS multi-tenant en production**. Des failles critiques d'isolation des données et de sécurité ont été identifiées qui nécessitent une refonte architecturale majeure.

### ⚠️ RISQUES CRITIQUES

1. **🔴 CRITIQUE**: Aucune isolation des données entre entreprises
2. **🔴 CRITIQUE**: Risque de fuite de données cross-tenant
3. **🔴 CRITIQUE**: Sécurité JWT insuffisante
4. **🟠 ÉLEVÉ**: Performance KPI non optimisée
5. **🟠 ÉLEVÉ**: Pas de scalabilité horizontale

---

## 1. AUDIT ARCHITECTURE BACKEND

### 1.1 Multi-Tenant - ÉTAT ACTUEL: ❌ INEXISTANT

**Problèmes identifiés:**

- ❌ Aucun champ `company_id` ou `tenant_id` dans les modèles
- ❌ Toutes les entreprises partagent la même base de données
- ❌ Aucune vérification de tenant dans les requêtes
- ❌ Un utilisateur de l'entreprise A peut accéder aux données de l'entreprise B
- ❌ Les KPI calculent des données de toutes les entreprises mélangées

**Impact:** 
- **CRITIQUE**: Violation de confidentialité
- **CRITIQUE**: Non-conformité RGPD
- **CRITIQUE**: Risque légal majeur

**Exemple de faille:**
```python
# ❌ ACTUEL - Accès à TOUTES les données
jobs = session.exec(select(Job)).all()  # Retourne les jobs de TOUTES les entreprises

# ✅ ATTENDU - Accès uniquement aux données de l'entreprise
jobs = session.exec(select(Job).where(Job.company_id == current_tenant_id)).all()
```

### 1.2 Base de Données - ÉTAT ACTUEL: ❌ ARCHITECTURE MONOLITHIQUE

**Problèmes identifiés:**

- ❌ Une seule base de données (`recrutement_db`)
- ❌ Pas de séparation MASTER_DB / TENANT_DB
- ❌ Pas de gestion dynamique des connexions
- ❌ Impossible de créer une base par entreprise

**Impact:**
- **CRITIQUE**: Impossible d'isoler les données
- **ÉLEVÉ**: Pas de scalabilité horizontale
- **ÉLEVÉ**: Sauvegardes complexes

### 1.3 Authentification JWT - ÉTAT ACTUEL: ⚠️ INSUFFISANT

**Problèmes identifiés:**

- ❌ `SECRET_KEY` hardcodé dans le code (`auth.py:17`)
- ❌ Pas de refresh token
- ❌ Token ne contient pas d'information sur le tenant
- ❌ Expiration fixe à 30 minutes (non configurable)
- ❌ Pas de rotation de clés

**Code problématique:**
```python
# backend/auth.py:17
SECRET_KEY = "your-secret-key-change-in-production"  # ❌ HARDCODÉ
```

**Impact:**
- **CRITIQUE**: Sécurité compromise
- **ÉLEVÉ**: Pas de gestion de session robuste
- **MOYEN**: Expérience utilisateur dégradée

### 1.4 Middleware Tenant - ÉTAT ACTUEL: ❌ INEXISTANT

**Problèmes identifiés:**

- ❌ Aucun middleware pour identifier le tenant
- ❌ Aucun middleware pour sélectionner la base de données
- ❌ Aucun middleware pour bloquer les accès cross-tenant
- ❌ Toutes les requêtes accèdent à toutes les données

**Impact:**
- **CRITIQUE**: Impossible d'isoler les données
- **CRITIQUE**: Risque de fuite de données

---

## 2. AUDIT SÉCURITÉ

### 2.1 Isolation des Données - ÉTAT: ❌ CRITIQUE

**Vulnérabilités:**

1. **Accès cross-tenant possible:**
   ```python
   # Un utilisateur peut modifier n'importe quel job
   @router.put("/jobs/{job_id}")
   def update_job(job_id: UUID, ...):
       job = session.get(Job, job_id)  # ❌ Pas de vérification tenant
       # Un utilisateur de l'entreprise A peut modifier un job de l'entreprise B
   ```

2. **KPI mélangent les données:**
   ```python
   # backend/routers/kpi.py:953
   total_candidates_sourced = session.exec(select(func.count(Candidate.id))).one()
   # ❌ Compte les candidats de TOUTES les entreprises
   ```

3. **Aucune validation de propriété:**
   - Aucune vérification que l'utilisateur appartient à l'entreprise
   - Aucune vérification que la ressource appartient à l'entreprise

### 2.2 Permissions - ÉTAT: ⚠️ PARTIEL

**Points positifs:**
- ✅ Vérification des rôles (manager, recruteur, client)
- ✅ Dépendances FastAPI pour les permissions

**Points négatifs:**
- ❌ Pas de vérification tenant dans les permissions
- ❌ Un manager de l'entreprise A peut voir les données de l'entreprise B
- ❌ Pas de granularité fine (ex: manager peut voir uniquement son département)

### 2.3 Validation des Entrées - ÉTAT: ✅ ACCEPTABLE

- ✅ Utilisation de Pydantic pour la validation
- ✅ Validation des types et formats
- ⚠️ Pas de validation stricte des UUID (risque d'injection)

---

## 3. AUDIT PERFORMANCE

### 3.1 KPI - ÉTAT: ⚠️ NON OPTIMISÉ

**Problèmes identifiés:**

1. **Requêtes complexes sans index:**
   ```python
   # backend/routers/kpi.py:211-230
   # Calcul Time to Hire - Pas d'index sur Application.status, Application.updated_at
   statement = select(
       func.avg(
           func.extract('epoch', Application.updated_at - Job.created_at) / 86400
       )
   ).select_from(Application).join(Job, Application.job_id == Job.id)
   ```

2. **Pas de cache:**
   - Les KPI sont recalculés à chaque requête
   - Pas de mise en cache Redis/Memcached
   - Impact sur les performances avec beaucoup de données

3. **Requêtes N+1 potentielles:**
   ```python
   # backend/routers/kpi.py:799-857
   for recruiter in recruiters:
       # ❌ Requête dans une boucle
       total_candidates = session.exec(...).one()
   ```

4. **Pas d'index sur les colonnes fréquemment filtrées:**
   - `Candidate.created_by` (pas d'index)
   - `Job.created_by` (pas d'index)
   - `Application.status` (pas d'index)
   - `Application.created_at` (pas d'index)

**Impact:**
- **ÉLEVÉ**: Performance dégradée avec beaucoup de données
- **MOYEN**: Temps de réponse KPI élevé
- **MOYEN**: Charge serveur importante

---

## 4. AUDIT FRONTEND

### 4.1 Protection des Routes - ÉTAT: ⚠️ PARTIEL

**Points positifs:**
- ✅ Middleware de protection des routes
- ✅ Vérification des tokens JWT

**Points négatifs:**
- ❌ Pas de vérification tenant côté frontend
- ❌ Un utilisateur peut modifier l'URL pour accéder à d'autres données
- ⚠️ Pas de gestion d'erreur robuste pour les accès non autorisés

### 4.2 Gestion des Rôles - ÉTAT: ✅ ACCEPTABLE

- ✅ Affichage conditionnel selon les rôles
- ✅ Routes protégées par rôle
- ⚠️ Pas de vérification tenant dans les appels API

---

## 5. PLAN DE REFONTE

### 5.1 Architecture Multi-Tenant à Implémenter

#### Phase 1: Base MASTER_DB
- [ ] Créer le schéma `master_db` avec:
  - Table `companies` (id, name, domain, status, created_at)
  - Table `tenant_databases` (id, company_id, db_name, connection_string, status)
  - Table `subscriptions` (id, company_id, plan_id, status, start_date, end_date)
  - Table `plans` (id, name, features, max_users, max_jobs, price)
  - Table `platform_admins` (id, email, password_hash, role)

#### Phase 2: Middleware Tenant
- [ ] Créer `TenantMiddleware` pour:
  - Identifier le tenant depuis le token JWT ou le domaine
  - Sélectionner dynamiquement la base de données
  - Bloquer les accès cross-tenant
  - Logger toutes les tentatives d'accès

#### Phase 3: Refactorisation Modèles
- [ ] Ajouter `company_id` à tous les modèles métier (si approche shared DB)
- [ ] OU créer une base de données par entreprise (approche DB per tenant)
- [ ] Migrer les données existantes

#### Phase 4: Sécurité JWT
- [ ] Déplacer `SECRET_KEY` dans les variables d'environnement
- [ ] Ajouter `company_id` dans le payload JWT
- [ ] Implémenter refresh token
- [ ] Rotation des clés

#### Phase 5: Optimisation KPI
- [ ] Créer les index nécessaires
- [ ] Implémenter le cache Redis
- [ ] Optimiser les requêtes N+1
- [ ] Ajouter la pagination

---

## 6. RECOMMANDATIONS PRIORITAIRES

### 🔴 PRIORITÉ 1 - CRITIQUE (À faire immédiatement)

1. **Implémenter l'isolation multi-tenant**
   - Créer MASTER_DB
   - Implémenter le middleware tenant
   - Refactoriser tous les endpoints

2. **Sécuriser JWT**
   - Déplacer SECRET_KEY dans .env
   - Ajouter company_id dans le token
   - Implémenter refresh token

3. **Bloquer les accès cross-tenant**
   - Vérifier tenant sur chaque endpoint
   - Logger les tentatives d'accès
   - Retourner 403 Forbidden si accès non autorisé

### 🟠 PRIORITÉ 2 - ÉLEVÉ (À faire rapidement)

4. **Optimiser les KPI**
   - Créer les index
   - Implémenter le cache
   - Optimiser les requêtes

5. **Améliorer la scalabilité**
   - Pool de connexions DB
   - Load balancing
   - Monitoring

### 🟡 PRIORITÉ 3 - MOYEN (À planifier)

6. **Améliorer l'observabilité**
   - Logs structurés
   - Métriques Prometheus
   - Tracing

7. **Tests de sécurité**
   - Tests d'intrusion
   - Tests de charge
   - Tests d'isolation

---

## 7. ESTIMATION

- **Phase 1 (MASTER_DB)**: 2-3 jours
- **Phase 2 (Middleware)**: 3-4 jours
- **Phase 3 (Refactorisation)**: 5-7 jours
- **Phase 4 (Sécurité)**: 2-3 jours
- **Phase 5 (Optimisation)**: 3-4 jours

**Total estimé**: 15-21 jours de développement

---

## 8. CONCLUSION

La plateforme nécessite une **refonte architecturale majeure** pour être prête pour une utilisation SaaS multi-tenant en production. Les risques critiques d'isolation des données doivent être corrigés **immédiatement** avant toute mise en production.

**Recommandation**: Ne pas déployer en production avant d'avoir implémenté au minimum les phases 1, 2 et 3.

---

**Prochaines étapes:**
1. Valider ce rapport avec l'équipe
2. Prioriser les phases de refonte
3. Commencer l'implémentation de la Phase 1
