# Configuration SMTP pour yemma-gates.com

## Informations DNS

Selon la configuration DNS de yemma-gates.com :
- **SMTP** : `smtp.yemma-gates.com` (CNAME vers `smtp-fr.securemail.pro`)
- **Mail** : `mail.yemma-gates.com` (CNAME vers `mail-fr.securemail.pro`)
- **Webmail** : `webmail.yemma-gates.com`

## Configuration dans `.env`

Créez ou modifiez le fichier `backend/.env` avec les paramètres suivants :

```env
# Configuration SMTP pour yemma-gates.com
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=587
SMTP_USER=no_reply@yemma-gates.com
SMTP_PASSWORD=votre-mot-de-passe-email-no-reply
SMTP_USE_TLS=true

# Adresse email de l'expéditeur
FROM_EMAIL=no_reply@yemma-gates.com

# URL de connexion pour les emails d'invitation
LOGIN_URL=http://localhost:3000/auth/login
```

## Ports à essayer

### Port 587 avec TLS (recommandé)
```env
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=587
SMTP_USE_TLS=true
```

### Port 465 avec SSL (alternative)
Si le port 587 ne fonctionne pas, essayez :
```env
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=465
SMTP_USE_TLS=false
```

### Port 25 (non sécurisé, non recommandé)
```env
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=25
SMTP_USE_TLS=false
```

## Étapes de configuration

1. **Créer le compte email `no_reply@yemma-gates.com`** (si ce n'est pas déjà fait)
   - Accédez à votre panneau de contrôle SecureMail
   - Créez le compte email `no_reply@yemma-gates.com`
   - Notez le mot de passe

2. **Créer le fichier `.env` dans le répertoire `backend/`** :
   ```bash
   cd backend
   cp env.example .env
   ```

3. **Modifier le fichier `.env`** et remplacer les valeurs :
   ```env
   SMTP_PASSWORD=le-mot-de-passe-du-compte-no-reply
   ```

4. **Redémarrer le serveur backend** :
   ```bash
   # Arrêter le serveur (Ctrl+C si en cours)
   uvicorn main:app --reload
   ```

## Test

Pour tester la configuration :

1. Créez un utilisateur depuis `/admin/users`
2. Vérifiez les logs du serveur backend :
   - ✅ `Email envoyé avec succès à ...` = Configuration OK
   - ❌ Erreurs SMTP = Vérifiez les identifiants et le port

## Dépannage

### Erreur d'authentification
- Vérifiez que le compte `no_reply@yemma-gates.com` existe
- Vérifiez que le mot de passe est correct
- Vérifiez que le compte email n'est pas verrouillé

### Erreur de connexion
- Vérifiez que le serveur `smtp.yemma-gates.com` est accessible
- Essayez un autre port (465 ou 25)
- Vérifiez les paramètres de pare-feu

### Emails dans les spams
- Configurez SPF et DKIM dans les DNS (si nécessaire)
- Vérifiez que l'adresse `no_reply@yemma-gates.com` est valide et active

## Support SecureMail

Si vous avez besoin d'aide avec SecureMail :
- Webmail : https://webmail.yemma-gates.com
- Documentation : Consultez votre fournisseur SecureMail
