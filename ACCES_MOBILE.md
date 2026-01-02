# 📱 Guide d'accès mobile depuis n'importe quel réseau

Ce guide explique comment accéder à votre application depuis votre mobile, même si votre mobile et votre ordinateur ne sont pas sur le même réseau Wi-Fi.

## 🌐 Option 1: Utiliser un tunnel (Recommandé)

Un tunnel crée une URL publique qui redirige vers votre serveur local. C'est la solution la plus simple pour tester depuis n'importe quel réseau.

### A. Avec ngrok (Recommandé)

1. **Installer ngrok** :
   ```bash
   # macOS
   brew install ngrok/ngrok/ngrok
   
   # Ou télécharger depuis https://ngrok.com/download
   ```

2. **Créer un compte gratuit** sur https://ngrok.com et obtenir votre token

3. **Configurer ngrok** :
   ```bash
   ngrok config add-authtoken VOTRE_TOKEN
   ```

4. **Démarrer le backend avec ngrok** :
   ```bash
   cd backend
   ./start_with_tunnel.sh ngrok
   ```

5. **Noter l'URL ngrok** affichée (ex: `https://abc123.ngrok.io`)

6. **Configurer le frontend** :
   - Créez un fichier `.env.local` dans `frontend/` avec :
     ```env
     NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
     ```
   - Redémarrez le frontend

7. **Accéder depuis votre mobile** :
   - Ouvrez l'URL ngrok du frontend dans votre navigateur mobile
   - Exemple: `https://abc123.ngrok.io` (si vous avez aussi exposé le frontend)

### B. Avec Cloudflare Tunnel (Gratuit, illimité)

1. **Installer cloudflared** :
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Démarrer le backend avec Cloudflare Tunnel** :
   ```bash
   cd backend
   ./start_with_tunnel.sh cloudflare
   ```

3. **Noter l'URL Cloudflare** affichée

4. **Configurer le frontend** comme pour ngrok

### C. Avec localtunnel (Gratuit, simple)

1. **Installer localtunnel** :
   ```bash
   npm install -g localtunnel
   ```

2. **Démarrer le backend avec localtunnel** :
   ```bash
   cd backend
   ./start_with_tunnel.sh localtunnel
   ```

3. **Noter l'URL localtunnel** affichée

4. **Configurer le frontend** comme pour ngrok

## 🔧 Option 2: Configuration manuelle

### Pour le backend

1. **Démarrer le backend accessible depuis le réseau** :
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Trouver l'IP publique de votre machine** :
   - Si vous êtes sur le même réseau local : utilisez l'IP locale (ex: `192.168.1.3`)
   - Si vous êtes sur un réseau différent : vous devez utiliser un tunnel (Option 1)

### Pour le frontend

1. **Démarrer le frontend accessible depuis le réseau** :
   ```bash
   cd frontend
   npm run dev -- -H 0.0.0.0
   ```

2. **Configurer l'URL de l'API** :
   - Créez un fichier `.env.local` dans `frontend/` avec l'URL du backend
   - Exemple pour réseau local : `NEXT_PUBLIC_API_URL=http://192.168.1.3:8000`
   - Exemple pour tunnel : `NEXT_PUBLIC_API_URL=https://abc123.ngrok.io`

## ⚙️ Configuration CORS

Le backend est maintenant configuré pour accepter toutes les origines en mode développement. Cela permet l'accès depuis n'importe quel réseau ou tunnel.

Pour la production, définissez la variable d'environnement :
```bash
export ENVIRONMENT=production
```

## 🔒 Sécurité

⚠️ **Important** : Les tunnels exposent votre application localement sur Internet. Ne les utilisez que pour le développement et le test.

Pour la production, utilisez :
- Un serveur dédié avec un domaine
- HTTPS avec certificat SSL
- Configuration CORS restrictive
- Authentification appropriée

## 🐛 Dépannage

### Erreur "Failed to fetch"
- Vérifiez que le backend est démarré avec `--host 0.0.0.0`
- Vérifiez que le tunnel est actif et que l'URL est correcte
- Vérifiez que `NEXT_PUBLIC_API_URL` est correctement configuré

### Erreur CORS
- Le backend accepte maintenant toutes les origines en développement
- Si le problème persiste, redémarrez le backend

### Le tunnel ne fonctionne pas
- Vérifiez que le backend est bien démarré
- Vérifiez que le port 8000 n'est pas bloqué par un firewall
- Essayez un autre type de tunnel (ngrok, cloudflare, localtunnel)

