# Accès Admin Sécurisé

## Vue d'ensemble

Une route admin sécurisée a été créée pour renforcer la sécurité de l'accès administrateur. Cette route utilise une authentification à deux niveaux :

1. **Authentification standard** : Email et mot de passe
2. **Token d'accès supplémentaire** (optionnel) : Un token supplémentaire peut être requis

## Routes

- **Page de connexion admin sécurisée** : `/admin-secure/login`
- **Dashboard admin sécurisé** : `/admin-secure`
- **Route admin standard** : `/admin` (toujours disponible)

## Configuration

### Frontend

Pour activer le token d'accès supplémentaire, ajoutez la variable d'environnement suivante dans votre fichier `.env.local` :

```bash
NEXT_PUBLIC_ADMIN_SECURE_TOKEN=votre-token-secret-ici
```

**Note** : Si cette variable n'est pas définie, le champ token ne sera pas affiché et seul l'email/mot de passe sera requis.

### Backend (optionnel)

Pour une sécurité renforcée côté serveur, vous pouvez ajouter ces variables dans `backend/.env` :

```bash
# Token d'accès supplémentaire requis pour l'accès admin
ADMIN_SECURE_TOKEN=votre-token-secret-ici

# Liste des IPs autorisées (séparées par des virgules)
# Laissez vide pour autoriser toutes les IPs
ADMIN_ALLOWED_IPS=192.168.1.100,10.0.0.50
```

## Utilisation

### Pour les administrateurs

1. Accédez à la page de choix de profil : `/auth/choice`
2. Cliquez sur "Administrateur"
3. Vous serez redirigé vers `/admin-secure/login`
4. Entrez vos identifiants :
   - Email administrateur
   - Mot de passe
   - Token d'accès (si configuré)
5. Après connexion réussie, vous accéderez au dashboard admin sécurisé

### Caractéristiques de sécurité

- ✅ Vérification stricte du rôle administrateur
- ✅ Token d'accès supplémentaire (optionnel)
- ✅ Enregistrement de toutes les tentatives de connexion
- ✅ Design distinctif pour indiquer la zone sécurisée
- ✅ Redirection automatique si l'utilisateur n'est pas admin
- ✅ Middleware de protection au niveau de l'application

## Migration depuis `/admin`

La route `/admin` standard reste disponible. Pour migrer vers la route sécurisée :

1. Mettez à jour vos liens internes pour pointer vers `/admin-secure`
2. Configurez le token d'accès si nécessaire
3. Informez les administrateurs de la nouvelle URL

## Désactivation

Pour désactiver le token d'accès supplémentaire, supprimez simplement la variable `NEXT_PUBLIC_ADMIN_SECURE_TOKEN` de votre fichier `.env.local`.
