# 🏢 Implémentation de l'Inscription d'Entreprise

## ✅ Résumé de l'Implémentation

L'endpoint `/api/auth/register-company` a été complètement implémenté selon les spécifications SaaS multi-tenant avec une base de données dédiée par entreprise.

---

## 📋 Fonctionnalités Implémentées

### 1. ✅ Validation Complète
- **Mot de passe** : Minimum 8 caractères
- **Unicité company_email** : Vérifié dans MASTER_DB
- **Unicité admin_email** : Vérifié dans la base tenant
- **Subdomain** : Génération automatique ou validation si fourni
- **Nettoyage des entrées** : Toutes les données sont nettoyées

### 2. ✅ Création Entreprise (MASTER_DB)
- Création dans la table `companies`
- Champs supportés :
  - `name` (company_name)
  - `contact_email` (company_email)
  - `contact_phone` (company_phone)
  - `country`
  - `industry`
  - `size` (company_size)
  - `subdomain` (généré ou validé)
  - `status` = "active"
  - `activated_at` = maintenant
  - `trial_ends_at` = +30 jours

### 3. ✅ Création Base de Données Dédiée
- Nom généré : `yemmagates_{company_id_hex[:12]}`
- Création PostgreSQL automatique
- Extension UUID activée
- **Isolation totale** : Chaque entreprise a sa propre base

### 4. ✅ Application du Schéma
- Toutes les tables créées via SQLModel
- Tables inclues :
  - users, jobs, candidates, applications
  - interviews, offers, onboarding_checklists
  - notifications, security_logs, settings
  - teams, team_members, etc.
- Index créés automatiquement

### 5. ✅ Subscription avec Plan Par Défaut
- Plan FREE créé automatiquement si inexistant
- Subscription créée avec :
  - `status` = "trial"
  - `trial_ends_at` = +30 jours
  - Lien avec le plan FREE

### 6. ✅ Création Utilisateur Admin
- Créé dans la base tenant dédiée
- Rôle : `administrateur`
- Mot de passe hashé (bcrypt)
- `company_id` lié à l'entreprise
- `is_active` = True

### 7. ✅ Rollback Complet
- Transaction globale avec rollback
- Si erreur :
  - Annulation de la création entreprise
  - Suppression de la base de données créée
  - Nettoyage des ressources

---

## 🔧 Fichiers Modifiés/Créés

### Nouveaux Fichiers
1. **`backend/utils/db_creator.py`**
   - `create_tenant_database()` : Crée une base PostgreSQL
   - `apply_schema_to_database()` : Applique le schéma
   - `drop_tenant_database()` : Supprime une base (rollback)
   - `sanitize_db_name()` : Nettoie les noms de base

### Fichiers Modifiés
1. **`backend/models_master.py`**
   - Ajout de `country`, `industry`, `size` à `Company`
   - `contact_email` indexé pour recherche rapide

2. **`backend/routers/auth.py`**
   - Nouveau schéma `CompanyRegister` avec tous les champs
   - Nouveau schéma `RegisterCompanyResponse`
   - Endpoint `/register-company` complètement refactorisé

---

## 📡 Format de la Requête API

### Endpoint
```
POST /api/auth/register-company
```

### Body (JSON)
```json
{
  "company_name": "Ma Société SARL",
  "company_email": "contact@masociete.com",
  "company_phone": "+221 77 123 45 67",
  "country": "Sénégal",
  "industry": "Technologie",
  "company_size": "medium",
  "admin_first_name": "Jean",
  "admin_last_name": "Dupont",
  "admin_email": "jean.dupont@masociete.com",
  "admin_password": "MotDePasseSecurise123!",
  "subdomain": "masociete" // Optionnel
}
```

### Réponse Succès (201)
```json
{
  "success": true,
  "message": "Entreprise créée avec succès",
  "company_id": "uuid-de-l-entreprise",
  "redirect": "/login",
  "access_token": "jwt-token-avec-company_id",
  "user_id": "uuid-de-l-admin"
}
```

### Réponse Erreur (400/500)
```json
{
  "success": false,
  "detail": "Message d'erreur détaillé"
}
```

---

## 🔒 Sécurité

1. **Mot de passe** : Hashé avec bcrypt (via `get_password_hash`)
2. **Token JWT** : Contient `company_id` pour isolation
3. **Validation stricte** : Toutes les entrées sont validées
4. **Rollback** : Aucune donnée partielle en cas d'erreur
5. **Isolation** : Base de données dédiée = isolation totale

---

## 🧪 Tests à Effectuer

### Test 1: Inscription Basique
```bash
curl -X POST http://localhost:8000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "company_email": "test@company.com",
    "admin_first_name": "Admin",
    "admin_last_name": "Test",
    "admin_email": "admin@test.com",
    "admin_password": "password123"
  }'
```

### Test 2: Vérifier la Base de Données
```sql
-- Dans PostgreSQL
\l
-- Devrait afficher une nouvelle base : yemmagates_xxxxxxxxxxxx

-- Dans la base MASTER
SELECT * FROM companies WHERE name = 'Test Company';
SELECT * FROM tenant_databases WHERE company_id = '...';
SELECT * FROM subscriptions WHERE company_id = '...';
```

### Test 3: Vérifier l'Utilisateur
```sql
-- Dans la base tenant (yemmagates_xxxxxxxxxxxx)
SELECT * FROM users WHERE email = 'admin@test.com';
-- Doit avoir company_id = ID de l'entreprise
```

### Test 4: Test de Rollback
```bash
# Essayer avec un email existant (doit échouer et rollback)
curl -X POST http://localhost:8000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company 2",
    "company_email": "test@company.com", // Email déjà utilisé
    ...
  }'
```

---

## ⚠️ Points d'Attention

1. **Permissions PostgreSQL** : L'utilisateur PostgreSQL doit avoir les droits `CREATE DATABASE`
2. **Variables d'environnement** : 
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_HOST`
   - `POSTGRES_PORT`
3. **Base MASTER** : Doit être initialisée avant (`schema_master.sql`)
4. **Plans** : Le plan FREE est créé automatiquement s'il n'existe pas

---

## 🚀 Prochaines Étapes Possibles

1. ✅ **Email de bienvenue** : Envoyer un email après inscription
2. ✅ **Sous-domaine** : Configurer `{subdomain}.yemma-gates.com`
3. ✅ **Webhook** : Notifier un service externe après création
4. ✅ **Validation email** : Demander confirmation de l'email
5. ✅ **Limites** : Vérifier les limites du plan avant création

---

## 📝 Notes Techniques

- Le nom de la base est généré depuis l'ID de l'entreprise pour garantir l'unicité
- La base est créée avec l'extension `uuid-ossp` pour les UUID
- Le schéma est appliqué via SQLModel (toutes les tables sont créées)
- Le rollback supprime la base de données si la création échoue après la création de la DB
- La transaction MASTER_DB est gérée manuellement pour permettre le rollback de la DB

---

**✅ L'implémentation est complète et prête à être testée !**
