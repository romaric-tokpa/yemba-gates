# 🚀 Démarrage Rapide - Accès depuis N'importe Quel Réseau

## Étapes Simples (5 minutes)

### 1. Installer Cloudflare Tunnel
```bash
brew install cloudflare/cloudflare/cloudflared
```

### 2. Démarrer l'application avec accès public
```bash
./start_public.sh cloudflare
```

### 3. Créer un tunnel pour le backend (dans un NOUVEAU terminal)
```bash
cloudflared tunnel --url http://localhost:8000
```

Notez l'URL affichée (ex: `https://xyz789.trycloudflare.com`)

### 4. Configurer le backend URL

**Option A : Via sessionStorage (Recommandé - Plus rapide)**
1. Ouvrez l'URL frontend dans votre navigateur
2. Ouvrez la console (F12)
3. Exécutez :
```javascript
sessionStorage.setItem('TUNNEL_BACKEND_URL', 'https://xyz789.trycloudflare.com')
```
4. Rechargez la page

**Option B : Via fichier .env.local**
Créez `frontend/.env.local` :
```env
NEXT_PUBLIC_API_URL=https://xyz789.trycloudflare.com
```
Redémarrez le frontend

### 5. Accéder depuis votre mobile
Ouvrez l'**URL Frontend** affichée par le script dans votre navigateur mobile.

## ✅ C'est tout !

Votre application est maintenant accessible depuis n'importe quel réseau Wi-Fi dans le monde.

## 🔄 À chaque redémarrage

Les URLs changent à chaque redémarrage (version gratuite). Vous devrez :
1. Noter la nouvelle URL Backend
2. Mettre à jour `frontend/.env.local`
3. Redémarrer le frontend si nécessaire

## 💡 Astuce : URLs Stables

Pour avoir des URLs qui ne changent pas, utilisez Cloudflare Tunnel avec un compte et un domaine personnalisé.

## 🆘 Problème ?

Consultez `GUIDE_ACCES_PUBLIC.md` pour plus de détails et de solutions.
