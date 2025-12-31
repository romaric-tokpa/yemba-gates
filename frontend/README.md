# Frontend - Application de Recrutement

Application Next.js avec TypeScript, Tailwind CSS et shadcn/ui.

## 🚀 Installation

1. **Installer les dépendances** :
```bash
npm install
```

2. **Configurer l'URL de l'API** :
Créez un fichier `.env.local` à la racine du dossier `frontend/` :
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🏃 Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

**Important** : Assurez-vous que votre API FastAPI est démarrée sur `http://localhost:8000`

## 📁 Structure du projet

```
frontend/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx           # Page d'accueil (Dashboard)
│   ├── besoins/           # Page des besoins
│   ├── candidats/          # Page des candidats
│   └── entretiens/         # Page des entretiens
├── components/             # Composants réutilisables
│   └── Sidebar.tsx        # Menu latéral
├── lib/                   # Utilitaires
│   └── utils.ts           # Fonctions utilitaires (cn)
└── public/                # Fichiers statiques
```

## 🎨 Design

L'application utilise un design moderne et professionnel avec :
- Palette de couleurs bleue (professionnel RH)
- Interface épurée et moderne
- Menu latéral fixe
- Cards et tableaux pour l'affichage des données
- Badges colorés pour les statuts

## 📝 Notes

- Les composants shadcn/ui peuvent être ajoutés via `npx shadcn-ui@latest add [component]`
- Le design est responsive et s'adapte aux différentes tailles d'écran
- Les icônes utilisent `lucide-react`

