# Configuration du Token d'Accès Admin

## Instructions

Pour activer le token d'accès supplémentaire pour la connexion admin sécurisée :

1. Créez un fichier `.env.local` dans le dossier `frontend/`

2. Ajoutez la variable suivante :

```bash
NEXT_PUBLIC_ADMIN_SECURE_TOKEN=votre-token-secret-ici
```

**Exemple :**
```bash
NEXT_PUBLIC_ADMIN_SECURE_TOKEN=admin-secret-token-2024
```

3. Redémarrez le serveur de développement Next.js :

```bash
npm run dev
```

## Désactivation

Pour désactiver le token (champ optionnel), laissez la variable vide ou ne la définissez pas :

```bash
NEXT_PUBLIC_ADMIN_SECURE_TOKEN=
```

ou supprimez simplement la ligne du fichier `.env.local`.

## Notes

- Le token est requis uniquement si la variable est définie et non vide
- Utilisez un token fort et sécurisé en production
- Ne commitez jamais le fichier `.env.local` (il est déjà dans `.gitignore`)
