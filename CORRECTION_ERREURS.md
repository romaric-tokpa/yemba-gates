# 🔧 Correction des Erreurs

## ❌ Erreur 1 : npm run dev:local

**Erreur** :
```
npm error path /Users/tokpa/Documents/recrutement-app/package.json
npm error errno -2
npm error enoent Could not read package.json
```

**Cause** : Vous n'êtes pas dans le dossier `frontend`

**Solution** :
```bash
cd frontend
npm run dev
```

## ❌ Erreur 2 : Address already in use (port 8000)

**Erreur** :
```
ERROR: [Errno 48] Address already in use
```

**Cause** : Le port 8000 est déjà utilisé par un autre processus

**Solution** :

### Option 1 : Utiliser le script d'arrêt
```bash
./stop_servers.sh
```

### Option 2 : Arrêter manuellement
```bash
# Trouver le processus
lsof -ti:8000

# Arrêter le processus (remplacez PID par le numéro affiché)
kill -9 PID
```

### Option 3 : Utiliser un autre port
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## ✅ Commandes Correctes

### Terminal 1 - Backend
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3 - Tunnel Backend
```bash
cloudflared tunnel --url http://localhost:8000
```

### Terminal 4 - Tunnel Frontend
```bash
cloudflared tunnel --url http://localhost:3000
```

## 🛑 Arrêter Tous les Serveurs

Utilisez le script :
```bash
./stop_servers.sh
```

Ou manuellement :
```bash
# Arrêter backend
lsof -ti:8000 | xargs kill -9

# Arrêter frontend
lsof -ti:3000 | xargs kill -9

# Arrêter les tunnels
pkill -f cloudflared
pkill -f "lt --port"
```




