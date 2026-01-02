# Structure des Routes de la Plateforme

## 📋 Vue d'ensemble

Ce document décrit la structure cohérente des routes de l'application de recrutement.

## 🏗️ Architecture des Routes

### Routes Publiques

```
/                           → Landing page
/auth/choice                → Choix du rôle pour connexion
/auth/login                 → Page de connexion
/login                      → Legacy (redirige vers /auth/login)
```

### Routes par Rôle

#### Manager (`/manager`)
```
/manager                    → Dashboard manager
/manager/jobs               → Liste des besoins
/manager/jobs/new           → Créer un besoin
/manager/jobs/[id]          → Détail d'un besoin
/manager/candidats         → Liste des candidats
/manager/candidats/[id]     → Détail d'un candidat
/manager/approbations       → Approbations des besoins
/manager/kpi                → Tableaux de bord KPI
/manager/entretiens         → Liste des entretiens
/manager/pipeline           → Pipeline de recrutement
/manager/teams               → Gestion des équipes
```

#### Recruteur (`/recruiter`)
```
/recruiter                  → Dashboard recruteur
/recruiter/jobs             → Liste des besoins
/recruiter/jobs/new         → Créer un besoin
/recruiter/jobs/[id]        → Détail d'un besoin
/recruiter/candidates       → Liste des candidats
/recruiter/candidates/[id]   → Détail d'un candidat
/recruiter/interviews       → Liste des entretiens
/recruiter/pipeline         → Pipeline de recrutement
```

#### Client (`/client`)
```
/client                     → Dashboard client
/client/jobs                → Liste des besoins
/client/jobs/new            → Créer un besoin
/client/jobs/[id]           → Détail d'un besoin
/client/candidats/[id]      → Détail d'un candidat
/client/shortlist           → Shortlists à valider
/client/history             → Historique
```

#### Administrateur (`/admin`)
```
/admin                      → Dashboard admin
/admin/users                → Gestion des utilisateurs
/admin/settings             → Paramètres
/admin/logs                 → Logs de sécurité
/admin/create               → Créer un utilisateur
```

### Routes Communes

```
/notifications              → Centre de notifications
/offres                     → Gestion des offres
/onboarding                 → Processus d'onboarding
```

## 🔄 Redirections Legacy

Les routes suivantes sont redirigées automatiquement :

- `/login` → `/auth/login`
- `/dashboard/*` → `/*` (les dashboards sont directement sous les rôles)

## 📝 Conventions de Nommage

### Standardisation

- **Français** : Utilisé pour les routes principales (candidats, entretiens, besoins)
- **Anglais** : Utilisé uniquement pour `/recruiter/candidates` et `/recruiter/interviews` (cohérence avec le préfixe `/recruiter`)

### Structure

```
/{role}/{ressource}         → Liste
/{role}/{ressource}/new     → Création
/{role}/{ressource}/[id]    → Détail
```

## 🛡️ Protection des Routes

Toutes les routes sous `/admin`, `/manager`, `/recruiter`, `/client` sont protégées et nécessitent :
- Un token d'authentification valide
- Un rôle approprié

## 📚 Utilisation dans le Code

### Import des routes

```typescript
import { ROUTES, getDashboardPath } from '@/lib/routes'

// Utilisation
const dashboardPath = getDashboardPath(userRole)
router.push(ROUTES.MANAGER.JOBS.LIST)
router.push(ROUTES.RECRUITER.JOBS.DETAIL(jobId))
```

### Exemples

```typescript
// Dashboard selon le rôle
const path = getDashboardPath('manager') // → '/manager'

// Route avec paramètre
const jobDetail = ROUTES.MANAGER.JOBS.DETAIL('123') // → '/manager/jobs/123'

// Route simple
const shortlist = ROUTES.CLIENT.SHORTLIST // → '/client/shortlist'
```

## 🔧 Migration

Pour migrer du code existant :

1. Remplacer les routes en dur par les constantes de `ROUTES`
2. Utiliser `getDashboardPath()` au lieu de la logique manuelle
3. Vérifier que tous les liens utilisent les routes centralisées

## ✅ Routes à Supprimer (Dupliquées)

Les routes suivantes doivent être supprimées ou redirigées :

- `/besoins` → Utiliser `/manager/jobs` ou `/recruiter/jobs`
- `/candidats` → Utiliser `/manager/candidats` ou `/recruiter/candidates`
- `/entretiens` → Utiliser `/manager/entretiens` ou `/recruiter/interviews`
- `/pipeline` → Utiliser `/manager/pipeline` ou `/recruiter/pipeline`
- `/kpi` → Utiliser `/manager/kpi`
- `/approbations` → Utiliser `/manager/approbations`
- `/shortlist` → Utiliser `/client/shortlist`
- `/dashboard/*` → Utiliser directement `/{role}/*`

