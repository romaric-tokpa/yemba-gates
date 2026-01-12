# Dépannage : Erreur d'authentification SMTP Gmail

## Erreur : `535 5.7.8 Username and Password not accepted`

Cette erreur signifie que Gmail refuse les identifiants fournis. Voici les solutions :

### ✅ Solution 1 : Vérifier que vous utilisez un mot de passe d'application

**⚠️ IMPORTANT** : Vous ne pouvez PAS utiliser votre mot de passe Gmail habituel !

Vous devez utiliser un **mot de passe d'application** (16 caractères) généré spécialement pour l'application.

#### Étapes pour créer un mot de passe d'application :

1. **Activez l'authentification à deux facteurs** (obligatoire) :
   - Allez sur https://myaccount.google.com/security
   - Activez la "Validation en deux étapes"

2. **Créez un mot de passe d'application** :
   - Allez sur https://myaccount.google.com/apppasswords
   - Sélectionnez "Autre (nom personnalisé)"
   - Nommez-le : "Application Recrutement"
   - Copiez le mot de passe de 16 caractères généré

3. **Mettez à jour le fichier `.env`** :
   ```env
   SMTP_PASSWORD=votre-mot-de-passe-d-application-ici
   ```
   - Remplacez `votre-mot-de-passe-d-application-ici` par le mot de passe d'application (16 caractères)
   - Vous pouvez utiliser le mot de passe avec ou sans espaces

4. **Redémarrez le serveur backend**

### ✅ Solution 2 : Vérifier que l'authentification à deux facteurs est activée

Si vous voyez un message "Vous n'avez pas activé la validation en deux étapes" sur la page des mots de passe d'application :

1. Activez l'authentification à deux facteurs :
   - https://myaccount.google.com/security
   - Section "Validation en deux étapes" → "Activer"

2. Attendez quelques minutes après l'activation

3. Réessayez de créer un mot de passe d'application

### ✅ Solution 3 : Vérifier la configuration dans `.env`

Assurez-vous que votre fichier `.env` contient exactement :

```env
# Configuration SMTP pour Gmail
FROM_EMAIL=yemma.gates@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yemma.gates@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop  # Votre mot de passe d'application (16 caractères)
SMTP_USE_TLS=true
```

**Vérifications importantes** :
- ✅ `SMTP_USER` doit être exactement `yemma.gates@gmail.com` (sans espaces)
- ✅ `SMTP_PASSWORD` doit être le mot de passe d'application (16 caractères)
- ✅ `SMTP_HOST` doit être `smtp.gmail.com` (pas `smtp.google.com` ou autre)
- ✅ `SMTP_PORT` doit être `587`
- ✅ `SMTP_USE_TLS` doit être `true`

### ✅ Solution 4 : Vérifier que le mot de passe n'a pas été révoqué

Si le mot de passe d'application fonctionnait avant mais ne fonctionne plus :

1. Allez sur https://myaccount.google.com/apppasswords
2. Vérifiez que le mot de passe d'application existe toujours
3. Si nécessaire, révoquez l'ancien et créez-en un nouveau
4. Mettez à jour `SMTP_PASSWORD` dans `.env`

### ✅ Solution 5 : Supprimer les espaces du mot de passe

Parfois, les espaces dans le mot de passe peuvent causer des problèmes :

1. Si votre mot de passe d'application est : `abcd efgh ijkl mnop`
2. Essayez sans espaces : `abcdefghijklmnop`
3. Mettez à jour `SMTP_PASSWORD` dans `.env`

### ✅ Solution 6 : Vérifier les logs du serveur

Après avoir redémarré le serveur backend, vérifiez les logs au démarrage :

```
✅ SMTP configuré - Host: smtp.gmail.com:587, User: yemma.gates@gmail.com, TLS: True
```

Si vous voyez ce message, la configuration est chargée. Si vous voyez toujours l'erreur 535, le problème est le mot de passe.

### 🔍 Vérification étape par étape

1. **Vérifier l'authentification à deux facteurs** :
   - Allez sur https://myaccount.google.com/security
   - La "Validation en deux étapes" doit être "Activée"

2. **Vérifier les mots de passe d'application** :
   - Allez sur https://myaccount.google.com/apppasswords
   - Vous devez pouvoir créer un nouveau mot de passe d'application

3. **Vérifier le fichier `.env`** :
   - Ouvrez `backend/.env`
   - Vérifiez que `SMTP_PASSWORD` contient un mot de passe d'application (16 caractères)
   - Vérifiez qu'il n'y a pas d'espaces en début/fin de ligne
   - Vérifiez que les guillemets ne sont pas nécessaires (ne pas entourer la valeur)

4. **Redémarrer le serveur** :
   ```bash
   cd backend
   # Arrêter (Ctrl+C)
   uvicorn main:app --reload
   ```

5. **Tester en créant un utilisateur** :
   - Connectez-vous en tant qu'administrateur
   - Créez un nouvel utilisateur
   - Vérifiez les logs du serveur backend

### 📚 Ressources

- **Guide complet** : [GUIDE_MOT_DE_PASSE_GMAIL.md](GUIDE_MOT_DE_PASSE_GMAIL.md)
- **Page des mots de passe d'application** : https://myaccount.google.com/apppasswords
- **Aide Google** : https://support.google.com/mail/?p=BadCredentials

---

**Si le problème persiste** après avoir suivi toutes ces étapes, vérifiez :
1. Que le compte Gmail `yemma.gates@gmail.com` est actif et accessible
2. Que vous avez bien activé l'authentification à deux facteurs
3. Que vous utilisez un mot de passe d'application (16 caractères) et non votre mot de passe Gmail habituel
