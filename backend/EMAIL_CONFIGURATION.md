# Configuration de l'envoi d'emails

## Problème actuel

Par défaut, le service email fonctionne en **mode simulation** (les emails sont affichés dans la console du serveur backend). Pour que les utilisateurs reçoivent réellement les emails, vous devez configurer un serveur SMTP.

## Guide rapide pour Gmail

Pour configurer Gmail (`yemma.gates@gmail.com`), consultez le guide détaillé : **[GUIDE_MOT_DE_PASSE_GMAIL.md](GUIDE_MOT_DE_PASSE_GMAIL.md)**

Résumé rapide :
1. Activez l'authentification à deux facteurs sur votre compte Gmail
2. Créez un mot de passe d'application : https://myaccount.google.com/apppasswords
3. Utilisez ce mot de passe dans `SMTP_PASSWORD` du fichier `.env`

## Configuration SMTP

### Étape 1 : Créer ou modifier le fichier `.env`

Dans le répertoire `backend/`, créez un fichier `.env` (ou modifiez-le s'il existe) avec les variables suivantes :

**Configuration pour Gmail (yemma.gates@gmail.com)** :
```env
# Configuration SMTP pour l'envoi d'emails (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yemma.gates@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-d-application-gmail
SMTP_USE_TLS=true

# Adresse email de l'expéditeur
FROM_EMAIL=yemma.gates@gmail.com

# URL de connexion pour les emails d'invitation
LOGIN_URL=http://localhost:3000/auth/login
```

**Note** : Pour Gmail, vous devez utiliser un **mot de passe d'application**, pas votre mot de passe Gmail habituel. Voir les instructions ci-dessous pour créer un mot de passe d'application.

### Étape 2 : Configuration selon votre fournisseur email

#### Pour Gmail (yemma.gates@gmail.com) - Configuration actuelle

1. **Activer l'authentification à deux facteurs** sur votre compte Gmail (`yemma.gates@gmail.com`)
2. **Créer un mot de passe d'application** :
   - Allez sur https://myaccount.google.com/apppasswords
   - Sélectionnez "Autre (nom personnalisé)" et entrez "Application Recrutement"
   - Copiez le mot de passe généré (16 caractères, format : `xxxx xxxx xxxx xxxx`)
3. **Configurer dans `.env`** :
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yemma.gates@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Le mot de passe d'application généré (sans espaces ou avec espaces, les deux fonctionnent)
   SMTP_USE_TLS=true
   FROM_EMAIL=yemma.gates@gmail.com
   ```

⚠️ **Important** : Vous devez utiliser un **mot de passe d'application** (16 caractères), pas votre mot de passe Gmail habituel. Le mot de passe d'application peut contenir des espaces ou non, les deux formats fonctionnent.

#### Pour Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=votre-email@outlook.com
SMTP_PASSWORD=votre-mot-de-passe
SMTP_USE_TLS=true
```

#### Pour yemma-gates.com (SecureMail)

Selon la configuration DNS, le serveur SMTP de yemma-gates.com utilise SecureMail :

```env
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=587  # Port standard avec TLS
SMTP_USER=no_reply@yemma-gates.com
SMTP_PASSWORD=votre-mot-de-passe-email
SMTP_USE_TLS=true
```

**Note** : 
- Le serveur SMTP est configuré sur `smtp.yemma-gates.com` (CNAME vers `smtp-fr.securemail.pro`)
- Utilisez le port 587 avec TLS activé
- Si le port 587 ne fonctionne pas, essayez le port 465 avec `SMTP_USE_TLS=false`
- Le mot de passe est celui du compte email `no_reply@yemma-gates.com`

**Alternative avec SSL** (si TLS ne fonctionne pas) :
```env
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=465
SMTP_USER=no_reply@yemma-gates.com
SMTP_PASSWORD=votre-mot-de-passe-email
SMTP_USE_TLS=false
```

### Étape 3 : Redémarrer le serveur backend

Après avoir configuré les variables d'environnement, redémarrez le serveur backend :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
cd backend
uvicorn main:app --reload
```

## Vérification

### Mode simulation (SMTP non configuré)

Si SMTP n'est pas configuré, vous verrez dans les logs du serveur backend :

```
⚠️  SMTP non configuré - Mode simulation activé
📧 EMAIL DE NOTIFICATION (SIMULATION)
```

### Mode production (SMTP configuré)

Si SMTP est correctement configuré, vous verrez :

```
✅ Email envoyé avec succès à utilisateur@example.com
```

## Dépannage

### Erreur d'authentification

Si vous voyez `SMTPAuthenticationError`, vérifiez :
- Le nom d'utilisateur SMTP est correct
- Le mot de passe est correct (pour Gmail, utilisez un mot de passe d'application)
- L'authentification à deux facteurs est activée (pour Gmail)

### Erreur de connexion

Si vous voyez une erreur de connexion, vérifiez :
- Le serveur SMTP est accessible depuis votre réseau
- Le port est correct (587 pour TLS, 465 pour SSL, 25 pour non sécurisé)
- Les pare-feu n'bloquent pas la connexion

### Emails non reçus

1. Vérifiez les logs du serveur backend pour voir si l'email a été envoyé
2. Vérifiez le dossier spam du destinataire
3. Vérifiez que l'adresse email du destinataire est valide
4. Testez avec votre propre adresse email d'abord

## Test

Pour tester l'envoi d'email, créez un utilisateur depuis `/admin/users`. L'email devrait être envoyé automatiquement.

## Améliorations de délivrabilité

Le service d'email inclut plusieurs fonctionnalités pour améliorer la délivrabilité :

1. **Format multipart (texte + HTML)** : Les emails sont envoyés avec une version texte et une version HTML
2. **Headers standard** : Date, Message-ID, MIME-Version pour une meilleure conformité
3. **Headers anti-spam** : X-Mailer, X-Priority, X-Entity-Ref-ID pour identification
4. **Encoding correct** : Headers encodés en UTF-8 pour les caractères spéciaux
5. **Message sans emojis** : Le texte du message est simplifié pour éviter les filtres anti-spam

### En cas de rejet comme spam (550 5.2.0 Spam Rejected)

Si vous recevez l'erreur `550 5.2.0 Spam Rejected`, cela peut être dû à :

1. **Configuration DNS du domaine** : Vérifiez que SPF et DKIM sont correctement configurés pour `yemma-gates.com`
2. **Compte email non vérifié** : Vérifiez que le compte `no_reply@yemma-gates.com` est correctement configuré
3. **Filtres anti-spam stricts** : Contactez le support SecureMail pour vérifier les paramètres de filtrage
4. **Réputation du domaine** : Si c'est un nouveau domaine, il peut prendre du temps à établir sa réputation

### Recommandations supplémentaires

- **SPF (Sender Policy Framework)** : Assurez-vous que votre enregistrement SPF autorise le serveur SMTP
- **DKIM (DomainKeys Identified Mail)** : Configurez la signature DKIM si disponible
- **DMARC** : Configurez DMARC pour une meilleure authentification
- **Liste blanche** : Demandez aux destinataires d'ajouter `no_reply@yemma-gates.com` à leur liste de contacts

## Sécurité

⚠️ **Important** : Ne commitez jamais le fichier `.env` contenant les mots de passe dans votre dépôt Git. Le fichier `.env` doit être dans `.gitignore`.
