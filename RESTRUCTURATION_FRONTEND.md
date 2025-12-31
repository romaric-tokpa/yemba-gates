# Restructuration Frontend - Architecture Modulaire

## ✅ Structure créée

### 1. Écran de sélection (Portal)
- **`/` (page.tsx)** : Page d'accueil avec 4 cartes pour sélectionner le rôle
- **`/auth/choice`** : Page alternative de sélection de rôle
- Le choix est enregistré dans `localStorage` et l'URL

### 2. Authentification
- **`/auth/login`** : Page de connexion commune avec vérification du rôle
- Vérifie que le rôle de l'utilisateur correspond au rôle sélectionné
- Redirige vers le dashboard approprié après connexion

### 3. Modules Dashboard

#### Module Recruteur (`/dashboard/recruiter`)
- **Layout** : `app/dashboard/recruiter/layout.tsx`
- **Dashboard** : `app/dashboard/recruiter/page.tsx`
- **Pages** :
  - `/dashboard/recruiter/besoins` - Gestion des besoins
  - `/dashboard/recruiter/candidats` - Gestion des candidats
  - `/dashboard/recruiter/pipeline` - Pipeline Kanban
  - `/dashboard/recruiter/entretiens` - Gestion des entretiens
  - `/dashboard/recruiter/offres` - Gestion des offres
  - `/dashboard/recruiter/onboarding` - Suivi onboarding

#### Module Manager (`/dashboard/manager`)
- **Layout** : `app/dashboard/manager/layout.tsx`
- **Dashboard** : `app/dashboard/manager/page.tsx`
- **Pages** :
  - `/dashboard/manager/approbations` - Validation des besoins
  - `/dashboard/manager/kpi` - Dashboard KPI global
  - `/dashboard/manager/onboarding` - Suivi onboarding

#### Module Client (`/dashboard/client`)
- **Layout** : `app/dashboard/client/layout.tsx`
- **Dashboard** : `app/dashboard/client/page.tsx`
- **Pages** :
  - `/dashboard/client/shortlist` - Consultation des shortlists

#### Module Administrateur (`/dashboard/admin`)
- **Layout** : `app/dashboard/admin/layout.tsx`
- **Dashboard** : `app/dashboard/admin/page.tsx`
- **Pages** :
  - `/dashboard/admin/users` - Gestion des utilisateurs
  - `/dashboard/admin/settings` - Paramétrage
  - `/dashboard/admin/logs` - Logs de sécurité

## 🔐 Protection des Routes

### Middleware (`middleware.ts`)
- Vérifie le JWT token dans les cookies ou headers
- Extrait le rôle depuis le token
- Vérifie que l'utilisateur est autorisé pour la route demandée
- Redirige vers le dashboard approprié si accès non autorisé
- Les administrateurs ont accès à tous les modules

### Routes autorisées par rôle

**Recruteur** :
- `/dashboard/recruiter/*`
- `/dashboard/recruiter/besoins/*`
- `/dashboard/recruiter/candidats/*`
- `/dashboard/recruiter/pipeline`
- `/dashboard/recruiter/entretiens`
- `/dashboard/recruiter/offres`
- `/dashboard/recruiter/onboarding`
- `/dashboard/recruiter/notifications`

**Manager** :
- `/dashboard/manager/*`
- `/dashboard/manager/approbations`
- `/dashboard/manager/kpi`
- `/dashboard/manager/onboarding`
- `/dashboard/manager/notifications`

**Client** :
- `/dashboard/client/*`
- `/dashboard/client/shortlist`
- `/dashboard/client/notifications`

**Administrateur** :
- Accès à tous les modules
- `/dashboard/admin/*`
- `/dashboard/recruiter/*`
- `/dashboard/manager/*`
- `/dashboard/client/*`

## 🔄 Flux d'authentification

1. **Sélection du rôle** (`/` ou `/auth/choice`)
   - L'utilisateur choisit son profil
   - Le choix est enregistré dans `localStorage`
   - Redirection vers `/auth/login?role={role}`

2. **Connexion** (`/auth/login`)
   - L'utilisateur entre ses identifiants
   - Vérification avec le backend FastAPI
   - Vérification que le rôle correspond au choix
   - Si non correspondant : erreur et empêchement de connexion
   - Si correspondant : redirection vers le dashboard approprié

3. **Protection des routes**
   - Le middleware vérifie le token JWT
   - Vérifie que le rôle autorise l'accès à la route
   - Redirige si accès non autorisé

## 📝 Prochaines étapes

### Migration des pages existantes

Les pages existantes doivent être déplacées dans les nouveaux modules :

**Recruteur** :
- `app/besoins/*` → `app/dashboard/recruiter/besoins/*`
- `app/candidats/*` → `app/dashboard/recruiter/candidats/*`
- `app/pipeline/page.tsx` → `app/dashboard/recruiter/pipeline/page.tsx`
- `app/entretiens/page.tsx` → `app/dashboard/recruiter/entretiens/page.tsx`
- `app/offres/page.tsx` → `app/dashboard/recruiter/offres/page.tsx`
- `app/onboarding/page.tsx` → `app/dashboard/recruiter/onboarding/page.tsx`

**Manager** :
- `app/approbations/page.tsx` → `app/dashboard/manager/approbations/page.tsx`
- `app/kpi/page.tsx` → `app/dashboard/manager/kpi/page.tsx`
- `app/onboarding/page.tsx` → `app/dashboard/manager/onboarding/page.tsx` (partagé)

**Client** :
- `app/shortlist/page.tsx` → `app/dashboard/client/shortlist/page.tsx`

**Administrateur** :
- `app/admin/*` → `app/dashboard/admin/*` (déjà créé)

### Mise à jour des liens

Tous les liens internes doivent être mis à jour pour utiliser les nouveaux chemins :
- `Link` components
- `router.push()` calls
- Redirections

## 🎨 Layouts

Chaque module a son propre layout qui :
- Inclut la Sidebar adaptée au rôle
- Inclut le header avec notifications
- Vérifie que l'utilisateur a le bon rôle
- Redirige si le rôle ne correspond pas

## 🔒 Sécurité

- ✅ Vérification du rôle lors de la connexion
- ✅ Protection des routes par middleware
- ✅ Vérification du rôle dans chaque layout
- ✅ Les clients ne peuvent pas accéder aux routes recruteur/manager
- ✅ Les recruteurs ne peuvent pas accéder aux routes manager/client
- ✅ Seuls les administrateurs ont accès à tout

