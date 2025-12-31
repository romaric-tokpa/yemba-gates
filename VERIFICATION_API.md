# Vérification de la connexion Frontend-Backend

## ✅ Modifications effectuées

### 1. Système de notifications (Toast)
- ✅ Créé `components/Toast.tsx` avec système de notifications
- ✅ Créé `components/ToastProvider.tsx` pour le contexte global
- ✅ Intégré dans `app/layout.tsx` pour être disponible partout
- ✅ Ajouté les animations CSS dans `globals.css`

### 2. Authentification et Bearer Token
- ✅ Vérifié que `authenticatedFetch` envoie bien le Bearer Token
- ✅ Amélioré `authenticatedFetch` pour gérer correctement les FormData (uploads de fichiers)
- ✅ Le token est automatiquement ajouté dans le header `Authorization: Bearer {token}`

### 3. Synchronisation des données
- ✅ Pipeline Kanban : Recharge automatiquement les candidats après chaque changement de statut
- ✅ Fiche détaillée candidat : Utilise `getCandidate()` au lieu de `getCandidates().find()` pour récupérer les données à jour
- ✅ Les deux écrans se synchronisent via le backend après chaque action

### 4. Notifications de succès/erreur
- ✅ Pipeline : Notifications pour déplacement de candidat (succès/erreur)
- ✅ Fiche candidat : Notifications pour upload CV et changement de statut
- ✅ Messages d'erreur spécifiques pour feedback manquant

## 📝 Fichiers à mettre à jour (alert() → toast)

Les fichiers suivants utilisent encore `alert()` et doivent être mis à jour :

1. `app/entretiens/page.tsx` - 4 alert()
2. `app/shortlist/page.tsx` - 3 alert()
3. `app/approbations/page.tsx` - 2 alert()
4. `app/candidats/page.tsx` - 4 alert()
5. `app/onboarding/page.tsx` - 4 alert()
6. `app/offres/page.tsx` - (à vérifier)

## 🔧 Comment utiliser le système de toast

```typescript
import { useToastContext } from '@/components/ToastProvider'

function MyComponent() {
  const { success, error, info, warning } = useToastContext()
  
  const handleAction = async () => {
    try {
      await someApiCall()
      success('Action réussie !')
    } catch (err) {
      error('Erreur lors de l\'action')
    }
  }
}
```

## 🔐 Vérification du Bearer Token

Tous les appels API utilisent `authenticatedFetch` qui :
1. Récupère le token depuis `localStorage` via `getToken()`
2. Ajoute automatiquement `Authorization: Bearer {token}` dans les headers
3. Gère correctement les FormData (sans Content-Type pour les uploads)

## 🔄 Synchronisation des données

### Pipeline Kanban → Fiche détaillée
1. Utilisateur déplace un candidat dans le Kanban
2. `updateCandidateStatus()` est appelé avec le Bearer Token
3. Le backend met à jour le statut
4. `loadCandidates()` recharge toutes les données depuis le backend
5. La fiche détaillée utilise `getCandidate()` qui récupère directement depuis le backend

### Fiche détaillée → Pipeline Kanban
1. Utilisateur change le statut dans la fiche détaillée
2. `updateCandidateStatus()` est appelé avec le Bearer Token
3. Le backend met à jour le statut
4. `loadCandidate()` recharge les données depuis le backend
5. Le Kanban se synchronise au prochain chargement ou rafraîchissement

## ✅ Checklist de vérification

- [x] `authenticatedFetch` envoie le Bearer Token
- [x] `authenticatedFetch` gère les FormData correctement
- [x] Pipeline recharge les données après chaque action
- [x] Fiche détaillée utilise `getCandidate()` pour les données à jour
- [x] Notifications toast pour Pipeline
- [x] Notifications toast pour Fiche candidat
- [ ] Notifications toast pour Entretiens
- [ ] Notifications toast pour Shortlist
- [ ] Notifications toast pour Approbations
- [ ] Notifications toast pour Candidats (liste)
- [ ] Notifications toast pour Onboarding
- [ ] Notifications toast pour Offres

