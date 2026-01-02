# 🌐 Accès depuis N'importe Quel Réseau Wi-Fi

## 🎯 Le Problème
Quand vous changez de réseau Wi-Fi, l'adresse `192.168.1.3:3000` ne fonctionne plus car c'est une adresse IP locale accessible uniquement depuis le même réseau.

## ✅ La Solution : Tunnel Public

Utilisez un tunnel pour créer une URL publique accessible depuis Internet.

## 🚀 Méthode la Plus Simple

### Étape 1 : Installer Cloudflare Tunnel
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Étape 2 : Démarrer le backend et le frontend
Dans le terminal 1 :
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Dans le terminal 2 :
```bash
cd frontend
npm run dev -- -H 0.0.0.0 -p 3000
```

### Étape 3 : Créer les tunnels
Dans le terminal 3 (tunnel backend) :
```bash
cloudflared tunnel --url http://localhost:8000
```
**Notez l'URL** affichée (ex: `https://abc123.trycloudflare.com`)

Dans le terminal 4 (tunnel frontend) :
```bash
cloudflared tunnel --url http://localhost:3000
```
**Notez l'URL** affichée (ex: `https://xyz789.trycloudflare.com`)

### Étape 4 : Configurer le frontend
Ouvrez l'URL frontend dans votre navigateur, puis dans la console (F12) :
```javascript
sessionStorage.setItem('TUNNEL_BACKEND_URL', 'https://abc123.trycloudflare.com')
```
Rechargez la page.

### Étape 5 : Accéder depuis votre mobile
Ouvrez l'URL frontend (`https://xyz789.trycloudflare.com`) sur votre mobile.

## 🎉 C'est tout !

Votre application est maintenant accessible depuis n'importe quel réseau Wi-Fi.

## 📝 Alternative : Script Automatique

Utilisez le script `start_public.sh` qui démarre tout automatiquement :
```bash
./start_public.sh cloudflare
```

Puis créez manuellement le tunnel backend dans un autre terminal :
```bash
cloudflared tunnel --url http://localhost:8000
```

## 🔄 À Chaque Redémarrage

Les URLs changent (version gratuite). Répétez les étapes 3-5 avec les nouvelles URLs.

## 💡 Astuce : URLs Stables

Avec un compte Cloudflare et un domaine personnalisé, vous pouvez avoir des URLs qui ne changent pas.

## 🆘 Aide

Consultez `GUIDE_ACCES_PUBLIC.md` pour plus de détails.



