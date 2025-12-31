# Configuration PWA (Progressive Web App)

L'application est configurée pour être installable sur mobile comme une application native.

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Générer les icônes PWA :
   - Créez des icônes 192x192 et 512x512 pixels
   - Placez-les dans `/public/icon-192x192.png` et `/public/icon-512x512.png`
   - Vous pouvez utiliser un outil en ligne comme https://realfavicongenerator.net/

## Fonctionnalités PWA

- ✅ Installation sur l'écran d'accueil (iOS et Android)
- ✅ Mode standalone (sans barre d'adresse du navigateur)
- ✅ Service Worker pour le cache et l'offline
- ✅ Manifest.json pour la configuration

## Test sur mobile

1. Construire l'application :
```bash
npm run build
npm start
```

2. Accéder depuis un smartphone :
   - Ouvrir l'URL dans Chrome/Safari
   - Sur Android : Menu → "Ajouter à l'écran d'accueil"
   - Sur iOS : Partager → "Sur l'écran d'accueil"

## Notes

- Le PWA est désactivé en mode développement (`disable: process.env.NODE_ENV === 'development'`)
- En production, le service worker sera automatiquement généré







