# 📋 Analyse des Fonctionnalités Manquantes

## 🔍 Comparaison avec le Cahier des Charges (specs.md)

### ✅ Fonctionnalités Implémentées

1. **Gestion des besoins de recrutement** ✅
   - Création, modification, soumission pour validation
   - Statuts (brouillon, validé, en cours, clôturé)
   - Router: `backend/routers/jobs.py`

2. **Gestion des candidats** ✅
   - Création, upload CV, tags, source
   - Router: `backend/routers/candidates.py`

3. **Pipeline Kanban** ✅
   - Vue pipeline avec drag & drop
   - Changement de statut
   - Frontend: `frontend/app/pipeline/page.tsx`

4. **Shortlist & Validation Client** ✅
   - Création shortlist, validation client
   - Router: `backend/routers/shortlists.py`

5. **Authentification & Rôles** ✅
   - JWT, rôles (recruteur, manager, client, admin)
   - Router: `backend/routers/auth.py`

6. **Notifications** ✅
   - Système de notifications
   - Router: `backend/routers/notifications.py`

7. **KPI Basiques** ✅
   - KPI summary et performance recruteurs
   - Router: `backend/routers/kpi.py` (mais incomplet)

---

## ❌ Fonctionnalités Manquantes Critiques

### 1. **Gestion des Entretiens** ❌ CRITIQUE

**Ce qui manque :**
- Router dédié pour les entretiens (`backend/routers/interviews.py`)
- Endpoints pour :
  - `POST /interviews/` - Planifier un entretien (US08)
  - `GET /interviews/` - Lister les entretiens
  - `PATCH /interviews/{id}/feedback` - Saisir le feedback (US09)
  - `GET /interviews/{id}` - Détails d'un entretien

**Modèle existe :** ✅ `Interview` dans `models.py`
**Frontend existe :** ⚠️ Page basique `frontend/app/entretiens/page.tsx` mais pas fonctionnelle

**User Stories concernées :**
- US08 : Planifier un entretien
- US09 : Saisir un feedback après entretien (obligatoire)
- US10 : Consulter les feedbacks

**Impact :** Bloque le workflow complet (pas de feedback = pas d'avancement)

---

### 2. **Gestion des Offres** ❌ CRITIQUE

**Ce qui manque :**
- Router dédié pour les offres (`backend/routers/offers.py`)
- Endpoints pour :
  - `POST /offers/` - Envoyer une offre (US14)
  - `PATCH /offers/{id}/accept` - Accepter une offre
  - `PATCH /offers/{id}/reject` - Refuser une offre
  - `GET /offers/` - Lister les offres en cours

**Modèle partiel :** ⚠️ Champs dans `Application` (`offer_sent_at`, `offer_accepted`, etc.) mais pas de router dédié

**User Stories concernées :**
- US14 : Envoyer une offre au candidat
- US15 : Suivre la checklist onboarding

**Impact :** Impossible de suivre le cycle complet jusqu'à l'onboarding

---

### 3. **Gestion de l'Onboarding** ❌ CRITIQUE

**Ce qui manque :**
- Router dédié pour l'onboarding (`backend/routers/onboarding.py`)
- Endpoints pour :
  - `GET /onboarding/{application_id}` - Voir la checklist
  - `PATCH /onboarding/{application_id}/checklist` - Mettre à jour la checklist
  - `POST /onboarding/{application_id}/complete` - Marquer l'onboarding comme terminé

**Modèle partiel :** ⚠️ Champs dans `Application` (`onboarding_completed`, `onboarding_completed_at`) mais pas de checklist structurée

**User Stories concernées :**
- US15 : Suivre la checklist onboarding
- US16 : Voir les offres et onboarding en cours

**Impact :** Impossible de clôturer complètement un recrutement

---

### 4. **Historique des Modifications** ❌ IMPORTANT

**Ce qui manque :**
- Modèle `JobHistory` dans `models.py` (existe dans `schema.sql` mais pas dans models.py)
- Router pour l'historique (`backend/routers/history.py`)
- Endpoints pour :
  - `GET /jobs/{id}/history` - Voir l'historique d'un besoin (US03)
  - `GET /candidates/{id}/history` - Voir l'historique d'un candidat (US06)

**User Stories concernées :**
- US03 : Voir l'historique des modifications d'un besoin
- US06 : Consulter l'historique d'un candidat

**Impact :** Traçabilité incomplète

---

### 5. **KPI Complets** ❌ CRITIQUE

**Ce qui existe actuellement :**
- ✅ KPI Summary basique : total_candidates, total_jobs, active_jobs, candidates_in_shortlist, candidates_hired
- ✅ Performance recruteurs : total_candidates, total_jobs, candidates_in_shortlist, candidates_hired
- ⚠️ `average_time_to_hire` existe mais retourne toujours 0.0 (TODO dans le code)

**Ce qui manque :** La plupart des KPI du tableau ne sont pas implémentés

#### KPI Manager Manquants :

**Temps & Process :**
- ❌ Time to Hire (formule: `Date embauche - Date recueil besoin`)
- ❌ Time to Fill (formule: `Date acceptation offre - Date ouverture poste`)
- ❌ Cycle moyen par étape
- ❌ Délai moyen feedback
- ❌ % postes respectant délai

**Qualité & Sélection :**
- ❌ Taux candidats qualifiés
- ❌ Taux de rejet par étape
- ❌ % shortlist acceptée
- ❌ Score moyen candidat
- ❌ Taux no-show entretien
- ❌ Taux turnover post-onboarding

**Volume & Productivité :**
- ❌ Nb CV traités
- ❌ Nb recrutements clos vs ouverts
- ❌ Nb entretiens réalisés

**Coût / Budget :**
- ❌ Coût moyen recrutement
- ❌ Coût par source
- ❌ Budget dépensé vs prévu

**Engagement & Satisfaction :**
- ❌ Taux acceptation offre
- ❌ Taux refus offre
- ❌ Taux réponse candidat

**Recruteur / Performance :**
- ❌ Taux réussite recruteur
- ❌ Temps moyen par étape
- ❌ Feedbacks fournis à temps

**Source & Canal :**
- ❌ Performance par source
- ❌ Taux conversion par source
- ❌ Temps moyen sourcing

**Onboarding :**
- ❌ Taux réussite onboarding
- ❌ Délai moyen onboarding
- ❌ Nb problèmes post-intégration

#### KPI Recruteur Manquants :

Tous les KPI recruteur du tableau sont manquants (voir specs.md lignes 619-734)

**Impact :** Le dashboard ne reflète pas les formules mathématiques demandées

---

### 6. **Feedback Obligatoire** ⚠️ PARTIELLEMENT IMPLÉMENTÉ

**Ce qui existe :**
- ✅ Règle US09 : Vérification qu'un feedback existe avant de passer à shortlist (dans `shortlists.py`)

**Ce qui manque :**
- ❌ Vérification pour toutes les transitions de statut
- ❌ Interface pour saisir le feedback après entretien
- ❌ Validation que le feedback est complet avant changement de statut

---

### 7. **Filtres et Recherche Avancée** ⚠️ PARTIELLEMENT IMPLÉMENTÉ

**Ce qui existe :**
- ✅ Filtres basiques (tags, source, statut) pour candidats

**Ce qui manque :**
- ❌ Filtres avancés pour les KPI (période, recruteur, client, poste, source, étape)
- ❌ Recherche full-text sur candidats
- ❌ Filtres pour les entretiens (date, type, interviewer)

---

### 8. **Export de Données** ❌

**Ce qui manque :**
- ❌ Export PDF/Excel pour reporting (mentionné dans specs.md ligne 615)
- ❌ Export des KPI
- ❌ Export des candidats

---

### 9. **Validation Manager des Besoins** ⚠️ PARTIELLEMENT IMPLÉMENTÉ

**Ce qui existe :**
- ✅ Champ `validated_by` et `validated_at` dans `Job`
- ✅ Endpoint `POST /jobs/{id}/submit` pour soumettre

**Ce qui manque :**
- ❌ Endpoint dédié pour valider/rejeter un besoin (US02)
- ❌ Notification au recruteur lors de la validation/rejet
- ❌ Interface manager pour voir les besoins en attente de validation

---

### 10. **Détection de Doublons** ❌

**Ce qui manque :**
- ❌ Détection automatique des doublons de candidats (mentionné dans specs.md ligne 74)
- ❌ Alerte lors de la création d'un candidat existant

---

## 📊 Résumé par Priorité

### 🔴 PRIORITÉ CRITIQUE (Bloque le workflow)

1. **Gestion des Entretiens** - Router + endpoints complets
2. **Gestion des Offres** - Router + endpoints complets
3. **Gestion de l'Onboarding** - Router + checklist structurée
4. **KPI Complets** - Implémenter toutes les formules du tableau

### 🟠 PRIORITÉ HAUTE (Impact fonctionnel)

5. **Historique des Modifications** - Modèle + router
6. **Validation Manager** - Endpoints dédiés
7. **Feedback Obligatoire** - Validation complète

### 🟡 PRIORITÉ MOYENNE (Amélioration UX)

8. **Filtres Avancés** - Pour KPI et recherche
9. **Export de Données** - PDF/Excel
10. **Détection de Doublons** - Algorithme de détection

---

## 🎯 Test Mental du Flux Complet

### Flux Attendu (selon specs.md) :

1. ✅ **Recueil du besoin** → Création job (brouillon)
2. ⚠️ **Validation manager** → Soumission OK, mais pas d'endpoint dédié validation
3. ✅ **Sourcing candidats** → Création candidats OK
4. ✅ **Qualification RH** → Changement statut OK
5. ❌ **Entretiens** → **MANQUE** : Pas de router pour planifier/saisir feedback
6. ✅ **Shortlist** → Création et validation client OK
7. ❌ **Offre** → **MANQUE** : Pas de router pour envoyer/suivre offres
8. ❌ **Onboarding** → **MANQUE** : Pas de router pour checklist
9. ✅ **Clôture** → Statut "embauché" existe mais pas de workflow complet

### Blocages Identifiés :

- **Étape 5 (Entretiens)** : Impossible de planifier et saisir feedback
- **Étape 7 (Offre)** : Impossible d'envoyer et suivre les offres
- **Étape 8 (Onboarding)** : Impossible de gérer la checklist onboarding
- **KPI** : Les formules mathématiques ne sont pas implémentées

---

## 💡 Recommandations

1. **Créer les routers manquants** :
   - `backend/routers/interviews.py`
   - `backend/routers/offers.py`
   - `backend/routers/onboarding.py`
   - `backend/routers/history.py`

2. **Compléter les KPI** :
   - Implémenter toutes les formules du tableau specs.md (lignes 448-609)
   - Ajouter les filtres (période, recruteur, client, poste, source, étape)

3. **Créer les modèles manquants** :
   - `JobHistory` dans `models.py`
   - Modèle `OnboardingChecklist` si nécessaire

4. **Compléter le frontend** :
   - Page entretiens fonctionnelle
   - Page offres
   - Page onboarding avec checklist
   - Dashboard KPI avec graphiques

