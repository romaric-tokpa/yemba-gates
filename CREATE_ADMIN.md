# Guide : Créer un compte Administrateur

## Méthode 1 : Utiliser le script Python (Recommandé)

1. **Assurez-vous que le serveur backend est lancé** :
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Dans un autre terminal, exécutez le script** :
   ```bash
   cd backend
   python create_admin.py
   ```

3. **Suivez les instructions** pour entrer :
   - Email
   - Mot de passe (minimum 6 caractères)
   - Prénom et nom
   - Téléphone (optionnel)
   - Département (optionnel)

4. **Le compte administrateur sera créé** et vous pourrez vous connecter avec ces identifiants.

## Méthode 2 : Utiliser l'API directement (curl)

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "User",
    "role": "administrateur",
    "phone": "+33123456789",
    "department": "IT"
  }'
```

## Méthode 3 : Utiliser l'interface Swagger

1. Accédez à http://localhost:8000/docs
2. Trouvez l'endpoint `POST /auth/register`
3. Cliquez sur "Try it out"
4. Remplissez le formulaire avec :
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123",
     "first_name": "Admin",
     "last_name": "User",
     "role": "administrateur"
   }
   ```
5. Cliquez sur "Execute"

## Se connecter en tant qu'Administrateur

### Option A : Via l'interface web (si l'authentification est activée)

1. Allez sur http://localhost:3000/login
2. Entrez l'email et le mot de passe de votre compte administrateur
3. Vous serez redirigé vers le dashboard administrateur

### Option B : Activer l'authentification (actuellement désactivée)

L'authentification est actuellement désactivée pour faciliter le développement. Pour l'activer :

1. **Modifier `frontend/lib/auth.ts`** :
   - Remplacez `return true` par `return getToken() !== null` dans `isAuthenticated()`
   - Remplacez `return 'recruteur'` par le code commenté dans `getUserRole()`

2. **Modifier `frontend/middleware.ts`** :
   - Décommentez le code d'authentification

3. **Redémarrer le serveur frontend** :
   ```bash
   npm run dev
   ```

## Accéder aux fonctionnalités Administrateur

Une fois connecté en tant qu'administrateur, vous aurez accès à :

- **Gestion des Utilisateurs** : `/admin/users`
- **Paramétrage** : `/admin/settings`
- **Logs de Sécurité** : `/admin/logs`

Ces liens apparaîtront automatiquement dans la sidebar si vous êtes connecté avec le rôle "administrateur".

## Notes importantes

- Le mot de passe doit contenir au moins 6 caractères
- L'email doit être unique dans la base de données
- Le rôle "administrateur" donne accès à toutes les fonctionnalités
- Les logs de connexion sont automatiquement enregistrés

