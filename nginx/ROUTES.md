# Configuration des Routes Nginx

## Vue d'ensemble

Cette configuration route toutes les requêtes entre le frontend Next.js et le backend FastAPI via nginx.

## Routes Backend (API FastAPI)

### Routes racine et système
- `GET /` - Point d'entrée de l'API
- `GET /health` - Health check (sans logs)
- `GET /docs` - Documentation Swagger (sans logs)
- `GET /openapi.json` - Schéma OpenAPI (sans logs)

### Routes d'authentification (`/auth/*`)
- `POST /auth/login` - Connexion utilisateur
- `POST /auth/register` - Inscription utilisateur
- `GET /auth/me` - Informations utilisateur actuel
- `PATCH /auth/me/password` - Changer le mot de passe
- `GET /auth/users` - Liste des utilisateurs

**Note:** `/auth/choice` est une route frontend (gérée par Next.js)

### Routes métier

#### Offres d'emploi (`/jobs/*`)
- `GET /jobs` - Liste des offres
- `POST /jobs` - Créer une offre
- `GET /jobs/{id}` - Détails d'une offre
- `PATCH /jobs/{id}` - Modifier une offre
- `DELETE /jobs/{id}` - Supprimer une offre
- `POST /jobs/{id}/submit` - Soumettre pour validation
- `POST /jobs/{id}/validate` - Valider une offre
- `POST /jobs/parse-job-description` - Parser une description
- Et autres endpoints...

#### Candidats (`/candidates/*`)
- `GET /candidates` - Liste des candidats
- `POST /candidates` - Créer un candidat
- `GET /candidates/{id}` - Détails d'un candidat
- `PATCH /candidates/{id}` - Modifier un candidat
- `POST /candidates/upload-photo` - Upload photo
- `POST /candidates/parse-cv` - Parser un CV
- `GET /candidates/{id}/cv` - Télécharger le CV
- Et autres endpoints...

#### Candidatures (`/applications/*`)
- `GET /applications` - Liste des candidatures
- `POST /applications` - Créer une candidature
- `GET /applications/job/{job_id}` - Candidatures pour un job
- `PATCH /applications/{id}/toggle-shortlist` - Basculer shortlist
- `DELETE /applications/{id}` - Supprimer une candidature
- Et autres endpoints...

#### Entretiens (`/interviews/*`)
- `GET /interviews` - Liste des entretiens
- `POST /interviews` - Créer un entretien
- `GET /interviews/{id}` - Détails d'un entretien
- `PATCH /interviews/{id}/feedback` - Ajouter un feedback
- `PATCH /interviews/{id}/status` - Changer le statut
- `DELETE /interviews/{id}` - Supprimer un entretien
- Et autres endpoints...

#### KPI (`/kpi/*`)
- `GET /kpi/manager` - KPI manager
- `GET /kpi/recruiter` - KPI recruteur
- `GET /kpi/client` - KPI client
- `GET /kpi/summary` - Résumé des KPI
- `GET /kpi/recruiters` - Performance des recruteurs
- `GET /kpi/manager/ai-analysis` - Analyse IA manager
- `GET /kpi/recruiter/ai-analysis` - Analyse IA recruteur
- Et autres endpoints...

#### Notifications (`/notifications/*`)
- `GET /notifications` - Liste des notifications
- `GET /notifications/unread/count` - Nombre de non lues
- `PATCH /notifications/{id}/read` - Marquer comme lue
- `PATCH /notifications/read-all` - Tout marquer comme lu
- `POST /notifications/check-pending-jobs` - Vérifier jobs en attente

#### Shortlists (`/shortlists/*`)
- `GET /shortlists` - Liste des shortlists
- `POST /shortlists/{application_id}/validate` - Valider une shortlist
- `GET /shortlists/notifications` - Notifications shortlist

#### Offres (`/offers/*`)
- `GET /offers` - Liste des offres
- `POST /offers` - Créer une offre
- `GET /offers/{application_id}` - Détails d'une offre
- `PATCH /offers/{application_id}/accept` - Accepter une offre
- `PATCH /offers/{application_id}/reject` - Rejeter une offre

#### Onboarding (`/onboarding/*`)
- `GET /onboarding` - Liste des onboarding
- `GET /onboarding/{application_id}` - Détails d'un onboarding
- `PATCH /onboarding/{application_id}/checklist` - Mettre à jour checklist
- `POST /onboarding/{application_id}/complete` - Compléter l'onboarding

#### Historique (`/history/*`)
- `GET /history/jobs/{job_id}` - Historique d'un job
- `GET /history/applications/{application_id}` - Historique d'une candidature
- `GET /history/candidates/{candidate_id}` - Historique d'un candidat
- `GET /history/deleted-jobs` - Jobs supprimés

#### Équipes (`/teams/*`)
- `GET /teams` - Liste des équipes
- `POST /teams` - Créer une équipe
- `GET /teams/{id}` - Détails d'une équipe
- `PUT /teams/{id}` - Modifier une équipe
- `DELETE /teams/{id}` - Supprimer une équipe
- `POST /teams/{id}/members` - Ajouter un membre
- `DELETE /teams/{id}/members/{user_id}` - Retirer un membre
- `GET /teams/users` - Liste des utilisateurs
- `POST /teams/users` - Créer un utilisateur
- `GET /teams/users/{id}` - Détails d'un utilisateur
- `PUT /teams/users/{id}` - Modifier un utilisateur
- `DELETE /teams/users/{id}` - Supprimer un utilisateur

#### Administration (`/admin/*`)
- `GET /admin/users` - Liste des utilisateurs
- `POST /admin/users` - Créer un utilisateur
- `GET /admin/users/{id}` - Détails d'un utilisateur
- `PATCH /admin/users/{id}` - Modifier un utilisateur
- `PATCH /admin/users/{id}/toggle-active` - Activer/Désactiver
- `DELETE /admin/users/{id}` - Supprimer un utilisateur
- `GET /admin/settings` - Paramètres
- `POST /admin/settings` - Créer un paramètre
- `PATCH /admin/settings/{key}` - Modifier un paramètre
- `DELETE /admin/settings/{key}` - Supprimer un paramètre
- `GET /admin/security-logs` - Logs de sécurité

#### Demandes d'entretien client (`/client-interview-requests/*`)
- `GET /client-interview-requests` - Liste des demandes
- `POST /client-interview-requests` - Créer une demande
- `GET /client-interview-requests/{id}` - Détails d'une demande
- `PATCH /client-interview-requests/{id}/schedule` - Planifier un entretien

### Fichiers statiques
- `GET /static/*` - Fichiers statiques (avec cache 30 jours)
- `GET /uploads/*` - Uploads (CVs, photos, etc.) (avec cache 7 jours)

## Routes Frontend (Next.js)

Toutes les routes suivantes sont gérées par Next.js via le catch-all `location /`:

### Routes publiques
- `/` - Page d'accueil (landing page)
- `/login` - Page de connexion
- `/auth/login` - Page de connexion (GET)
- `/auth/choice` - Choix du rôle
- `/auth/choice/admin` - Choix admin

### Routes Manager (`/manager/*`)
- `/manager` - Dashboard manager
- `/manager/jobs` - Liste des offres
- `/manager/jobs/new` - Créer une offre
- `/manager/jobs/[id]` - Détails d'une offre
- `/manager/candidats` - Liste des candidats
- `/manager/candidats/[id]` - Détails d'un candidat
- `/manager/entretiens` - Liste des entretiens
- `/manager/kpi` - KPI manager
- `/manager/pipeline` - Pipeline
- `/manager/teams` - Équipes
- `/manager/besoins` - Besoins
- `/manager/approbations` - Approbations

### Routes Recruteur (`/recruiter/*`)
- `/recruiter` - Dashboard recruteur
- `/recruiter/jobs` - Liste des offres
- `/recruiter/jobs/new` - Créer une offre
- `/recruiter/jobs/[id]` - Détails d'une offre
- `/recruiter/candidates` - Liste des candidats
- `/recruiter/candidates/[id]` - Détails d'un candidat
- `/recruiter/pipeline` - Pipeline
- `/recruiter/interviews` - Entretiens

### Routes Client (`/client/*`)
- `/client` - Dashboard client
- `/client/jobs` - Liste des offres
- `/client/jobs/new` - Créer une offre
- `/client/jobs/[id]` - Détails d'une offre
- `/client/candidats/[id]` - Détails d'un candidat
- `/client/entretiens` - Entretiens
- `/client/kpi` - KPI client
- `/client/shortlist` - Shortlist
- `/client/history` - Historique

### Routes Admin (`/admin/*`)
- `/admin` - Dashboard admin
- `/admin/users` - Gestion des utilisateurs
- `/admin/settings` - Paramètres
- `/admin/create` - Créer
- `/admin/logs` - Logs

### Routes communes
- `/candidats` - Liste des candidats
- `/candidats/[id]` - Détails d'un candidat
- `/besoins` - Liste des besoins
- `/besoins/nouveau` - Créer un besoin
- `/besoins/[id]` - Détails d'un besoin
- `/entretiens` - Liste des entretiens
- `/kpi` - KPI
- `/notifications` - Notifications
- `/offres` - Offres
- `/onboarding` - Onboarding
- `/pipeline` - Pipeline
- `/shortlist` - Shortlist
- `/approbations` - Approbations
- `/profile/change-password` - Changer le mot de passe

### Routes Dashboard
- `/dashboard/admin` - Dashboard admin
- `/dashboard/manager` - Dashboard manager
- `/dashboard/recruiter` - Dashboard recruteur
- `/dashboard/client` - Dashboard client

## Ordre de priorité du routage

1. **Fichiers statiques** (`/static/`, `/uploads/`) - Priorité la plus haute
2. **Routes API backend spécifiques** - Routes exactes et regex
3. **Frontend Next.js** - Catch-all pour toutes les autres routes

## Configuration des timeouts

- `proxy_read_timeout: 300s` - Pour les routes API backend (opérations longues)
- `proxy_read_timeout: 60s` - Pour le frontend (SSR, etc.)
- `client_max_body_size: 50M` - Pour les uploads de fichiers

## Cache

- `/static/*` - Cache 30 jours (immutable)
- `/uploads/*` - Cache 7 jours (public)

## Notes importantes

1. **Routes `/auth/login`**: 
   - `POST /auth/login` → Backend (API)
   - `GET /auth/login` → Frontend (page Next.js, mais peut retourner 405 du backend - normal)

2. **Routes `/auth/choice`**: 
   - Toujours routées vers le frontend (Next.js)

3. **Fichiers statiques**: 
   - Servis directement par le backend FastAPI via proxy_pass
   - Pas d'alias local dans nginx

4. **Toutes les autres routes**: 
   - Routées vers le frontend Next.js qui gère le routing côté client

## Test de la configuration

Pour tester la syntaxe nginx:
```bash
docker-compose exec nginx nginx -t
```

Pour recharger la configuration:
```bash
docker-compose exec nginx nginx -s reload
```
