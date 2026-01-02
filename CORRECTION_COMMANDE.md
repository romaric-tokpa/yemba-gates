# 🔧 Correction de la Commande Frontend

## ❌ Erreur
```bash
npm run dev -- -H 0.0.0.
```
**Problème** : Il manque un `0` à la fin (vous avez tapé `0.0.0.` au lieu de `0.0.0.0`)

## ✅ Solutions Correctes

### Option 1 : Utiliser les variables d'environnement (Recommandé)
```bash
cd frontend
HOSTNAME=0.0.0.0 npm run dev
```

### Option 2 : Utiliser npx directement
```bash
cd frontend
npx next dev -H 0.0.0.0
```

### Option 3 : Modifier package.json (Permanent)
Ajoutez dans `frontend/package.json` :
```json
"scripts": {
  "dev": "next dev -H 0.0.0.0",
  ...
}
```

Puis utilisez simplement :
```bash
npm run dev
```

## 📝 Note
- `0.0.0.0` signifie "écouter sur toutes les interfaces réseau"
- Cela permet l'accès depuis d'autres appareils sur le même réseau
- Pour l'accès depuis Internet, vous devez utiliser un tunnel (cloudflare, localtunnel, etc.)




