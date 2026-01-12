# Guide : Obtenir un mot de passe d'application Gmail

Ce guide vous explique comment créer un mot de passe d'application Gmail pour permettre à l'application d'envoyer des emails via SMTP.

## Prérequis

1. Vous devez avoir un compte Gmail (`yemma.gates@gmail.com`)
2. L'authentification à deux facteurs (2FA) doit être activée sur votre compte Gmail

## Étape 1 : Activer l'authentification à deux facteurs

Si l'authentification à deux facteurs n'est pas déjà activée :

1. Allez sur https://myaccount.google.com/security
2. Dans la section "Connexion à Google", trouvez "Validation en deux étapes"
3. Cliquez sur "Activer"
4. Suivez les instructions pour configurer l'authentification à deux facteurs
   - Vous pouvez utiliser :
     - Un téléphone (SMS ou appel vocal)
     - Une application d'authentification (Google Authenticator, Authy, etc.)
     - Une clé de sécurité

**Note** : L'authentification à deux facteurs est obligatoire pour créer des mots de passe d'application.

## Étape 2 : Créer un mot de passe d'application

1. **Connectez-vous à votre compte Google** : https://myaccount.google.com

2. **Allez sur la page des mots de passe d'application** :
   - Option A : Accédez directement : https://myaccount.google.com/apppasswords
   - Option B : 
     - Allez sur https://myaccount.google.com/security
     - Dans la section "Connexion à Google", trouvez "Validation en deux étapes"
     - Cliquez sur "Mots de passe des applications" (en bas de la page)

3. **Sélectionnez l'application et le périphérique** :
   - Dans le menu déroulant "Sélectionner une app", choisissez **"Autre (nom personnalisé)"**
   - Entrez un nom descriptif, par exemple : **"Application Recrutement"** ou **"SMTP yemma-gates"**
   - Cliquez sur **"Générer"**

4. **Copiez le mot de passe généré** :
   - Google génère un mot de passe de 16 caractères
   - Format : `xxxx xxxx xxxx xxxx` (avec des espaces) ou `xxxxxxxxxxxxxxxx` (sans espaces)
   - **⚠️ IMPORTANT** : Ce mot de passe ne sera affiché qu'une seule fois !
   - Copiez-le immédiatement et collez-le dans un endroit sûr

5. **Fermez la fenêtre** : Vous ne pourrez plus voir ce mot de passe après avoir fermé la fenêtre

## Étape 3 : Configurer le fichier .env

1. **Ouvrez le fichier `.env`** dans le répertoire `backend/`

2. **Trouvez la ligne `SMTP_PASSWORD=`** :
   ```env
   SMTP_PASSWORD=votre-mot-de-passe-d-application-gmail
   ```

3. **Remplacez `votre-mot-de-passe-d-application-gmail`** par le mot de passe d'application que vous venez de copier :
   ```env
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
   
   **Note** : Vous pouvez utiliser le mot de passe avec ou sans espaces, les deux formats fonctionnent :
   - `SMTP_PASSWORD=abcd efgh ijkl mnop` (avec espaces)
   - `SMTP_PASSWORD=abcdefghijklmnop` (sans espaces)

4. **Vérifiez que les autres variables SMTP sont correctes** :
   ```env
   FROM_EMAIL=yemma.gates@gmail.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yemma.gates@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Votre mot de passe d'application ici
   SMTP_USE_TLS=true
   ```

5. **Sauvegardez le fichier `.env`**

## Étape 4 : Redémarrer le serveur backend

Après avoir mis à jour le fichier `.env`, redémarrez le serveur backend :

```bash
cd backend
# Arrêtez le serveur (Ctrl+C s'il est en cours d'exécution)
# Puis relancez-le
uvicorn main:app --reload
```

Vous devriez voir dans les logs :
```
✅ SMTP configuré - Host: smtp.gmail.com:587, User: yemma.gates@gmail.com, TLS: True
```

## Étape 5 : Tester l'envoi d'email

Pour tester que l'envoi d'email fonctionne :

1. Connectez-vous à l'application en tant qu'administrateur
2. Allez sur `/admin/users`
3. Créez un nouvel utilisateur
4. Vérifiez que l'email d'invitation est bien envoyé

## Dépannage

### Erreur : "Impossible de trouver la page des mots de passe d'application"

**Cause** : L'authentification à deux facteurs n'est pas activée.

**Solution** :
1. Activez d'abord l'authentification à deux facteurs (voir Étape 1)
2. Attendez quelques minutes après l'activation
3. Réessayez d'accéder à la page des mots de passe d'application

### Erreur : "SMTPAuthenticationError" ou "Erreur d'authentification SMTP"

**Causes possibles** :
1. Le mot de passe d'application est incorrect
2. Le mot de passe contient des caractères spéciaux non échappés
3. L'authentification à deux facteurs a été désactivée

**Solutions** :
1. Vérifiez que vous avez copié le mot de passe d'application correctement
2. Essayez de supprimer les espaces du mot de passe dans `.env`
3. Vérifiez que l'authentification à deux facteurs est toujours activée
4. Créez un nouveau mot de passe d'application si nécessaire

### Erreur : "Username and Password not accepted"

**Cause** : Vous utilisez votre mot de passe Gmail habituel au lieu d'un mot de passe d'application.

**Solution** : Utilisez uniquement un mot de passe d'application (16 caractères), jamais votre mot de passe Gmail habituel.

### Erreur : Le mot de passe d'application ne fonctionne plus

**Causes possibles** :
1. L'authentification à deux facteurs a été désactivée
2. Le mot de passe d'application a été révoqué
3. Le mot de passe d'application a expiré (rare)

**Solution** :
1. Vérifiez que l'authentification à deux facteurs est toujours activée
2. Allez sur https://myaccount.google.com/apppasswords
3. Révoquez l'ancien mot de passe d'application
4. Créez un nouveau mot de passe d'application
5. Mettez à jour `SMTP_PASSWORD` dans le fichier `.env`

## Sécurité

⚠️ **Important** :

1. **Ne partagez jamais votre mot de passe d'application** avec d'autres personnes
2. **Ne commitez jamais le fichier `.env`** dans Git (il doit être dans `.gitignore`)
3. **Révokez les mots de passe d'application** que vous n'utilisez plus
4. **Utilisez des mots de passe d'application différents** pour chaque application/service
5. **Gardez le fichier `.env` sécurisé** sur votre serveur

## Révocation d'un mot de passe d'application

Si vous devez révoquer un mot de passe d'application :

1. Allez sur https://myaccount.google.com/apppasswords
2. Trouvez le mot de passe d'application à révoquer
3. Cliquez sur l'icône de suppression (🗑️) à côté du mot de passe
4. Confirmez la révocation

## Ressources utiles

- **Page des mots de passe d'application** : https://myaccount.google.com/apppasswords
- **Sécurité du compte Google** : https://myaccount.google.com/security
- **Aide Google sur les mots de passe d'application** : https://support.google.com/accounts/answer/185833

## Exemple de configuration complète

Voici un exemple de configuration complète dans le fichier `.env` :

```env
# Configuration de la base de données PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recrutement_db

# Configuration du serveur
HOST=0.0.0.0
PORT=8000

# Clé API pour Google Gemini
GEMINI_API_KEY=AIzaSyBiKaxjMiAoirUYeC5dZBc5MknA1ogEh4Q
OPENAI_API_KEY=AIzaSyBiKaxjMiAoirUYeC5dZBc5MknA1ogEh4Q

# URL de connexion pour les emails d'invitation
LOGIN_URL=http://localhost:3000/auth/login

# Configuration SMTP pour Gmail
FROM_EMAIL=yemma.gates@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yemma.gates@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop  # Remplacez par votre mot de passe d'application
SMTP_USE_TLS=true
```

---

**Bonne configuration !** 🚀
