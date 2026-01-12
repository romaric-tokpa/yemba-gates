# Guide de dépannage - Envoi d'emails

Si les utilisateurs ne reçoivent pas les emails de bienvenue après leur création, suivez ces étapes de dépannage :

## 1. Vérifier la configuration SMTP

Vérifiez que le fichier `backend/.env` contient les bonnes valeurs :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yemma.gates@gmail.com
SMTP_PASSWORD=yjzw ntpd cfgz ssop
SMTP_USE_TLS=true
FROM_EMAIL=yemma.gates@gmail.com
```

⚠️ **IMPORTANT** : Le mot de passe doit être le **mot de passe d'application Gmail** (pas le mot de passe du compte Gmail).

## 2. Vérifier que le serveur a été redémarré

Après avoir modifié le fichier `.env`, vous devez **redémarrer le serveur backend** pour que les changements soient pris en compte.

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
cd backend
uvicorn main:app --reload
```

## 3. Vérifier les logs du serveur

Quand un utilisateur est créé, vous devriez voir dans les logs du serveur :

- ✅ `✅ SMTP configuré - Host: smtp.gmail.com:587, User: yemma.gates@gmail.com, TLS: True`
- ✅ `📧 Tentative d'envoi d'email d'invitation à [email]`
- ✅ `✅ Email envoyé avec succès à [email]`

Si vous voyez :
- ⚠️ `⚠️ SMTP non configuré - Les emails seront affichés dans la console (mode simulation)` → La configuration SMTP n'est pas correcte
- ❌ `❌ Erreur d'authentification SMTP` → Le mot de passe d'application est incorrect
- ❌ `❌ Erreur lors de l'envoi SMTP` → Vérifiez la connexion internet ou les paramètres SMTP

## 4. Tester l'envoi d'email manuellement

Utilisez le script de test pour vérifier que l'envoi d'email fonctionne :

```bash
cd backend
python test_email.py votre-email@example.com
```

Ce script enverra un email de test et affichera les erreurs éventuelles.

## 5. Vérifier les spams

Les emails peuvent être filtrés comme spam. Vérifiez :
- Le dossier **Spam / Indésirables** de la boîte mail
- Les filtres de la boîte mail
- La liste noire

## 6. Vérifier le mot de passe d'application Gmail

Si vous obtenez une erreur d'authentification, vérifiez que vous utilisez bien un **mot de passe d'application Gmail** et non le mot de passe du compte :

1. Allez sur https://myaccount.google.com/apppasswords
2. Connectez-vous avec votre compte Gmail
3. Créez un nouveau mot de passe d'application
4. Copiez le mot de passe généré (16 caractères sans espaces, par exemple : `yjzwntpdcfgzssop`)
5. Utilisez ce mot de passe dans le fichier `.env` (sans espaces)

## 7. Vérifier les paramètres du compte Gmail

Assurez-vous que :
- L'authentification à deux facteurs (2FA) est activée sur le compte Gmail
- L'option "Autoriser les applications moins sécurisées" n'est pas nécessaire (Gmail utilise les mots de passe d'application à la place)

## 8. Vérifier la connexion internet

Assurez-vous que le serveur a accès à Internet pour se connecter au serveur SMTP de Gmail (smtp.gmail.com:587).

## Erreurs courantes

### "SMTP non configuré"
- Le fichier `.env` n'existe pas ou les variables SMTP ne sont pas définies
- Le serveur n'a pas été redémarré après modification du `.env`

### "Erreur d'authentification SMTP"
- Le mot de passe d'application est incorrect
- Le mot de passe d'application a expiré (révoqué)
- Vous utilisez le mot de passe du compte au lieu du mot de passe d'application

### "Email envoyé mais non reçu"
- L'email est dans les spams
- L'adresse email est incorrecte
- Le serveur SMTP a accepté l'email mais l'a filtré (vérifiez les logs Gmail)

## Aide supplémentaire

Si le problème persiste, consultez :
- `backend/EMAIL_CONFIGURATION.md` - Guide de configuration SMTP détaillé
- `backend/GUIDE_MOT_DE_PASSE_GMAIL.md` - Guide pour obtenir un mot de passe d'application Gmail
- `backend/TROUBLESHOOTING_SMTP.md` - Guide de dépannage SMTP avancé
