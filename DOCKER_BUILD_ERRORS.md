# Erreurs de build Docker - Fonctions manquantes

## Problème

Le build Docker échoue car plusieurs fonctions/types ne sont pas exportés depuis `frontend/lib/api.ts` mais sont utilisés dans certaines pages.

## Fonctions/types manquants

### Offres (`app/offres/page.tsx`)
- `getOffers`
- `sendOffer`
- `acceptOffer`
- `rejectOffer`
- `OfferResponse`
- `OfferSend`
- `OfferDecision`

### Onboarding (`app/onboarding/page.tsx`)
- `getOnboardingList`
- `getOnboardingChecklist`
- `updateOnboardingChecklist`
- `completeOnboarding`
- `OnboardingChecklist`
- `OnboardingChecklistUpdate`

### Shortlist (`app/shortlist/page.tsx`)
- `getApplicationHistory`
- `ApplicationHistoryItem`

### Notifications (`app/notifications/page.tsx`)
- `getRecruiterNotifications`

## Solutions

### Option 1 : Corriger le code (Recommandé)

Ajouter les fonctions manquantes dans `frontend/lib/api.ts` en se basant sur les routes backend existantes :
- Routes d'offres : `backend/routers/offers.py`
- Routes d'onboarding : `backend/routers/onboarding.py`
- Routes de notifications : `backend/routers/notifications.py`

### Option 2 : Désactiver temporairement les pages

Pour permettre le build Docker immédiatement, renommez temporairement les fichiers problématiques :

```bash
cd frontend/app
mv offres/page.tsx offres/page.tsx.disabled
mv onboarding/page.tsx onboarding/page.tsx.disabled
mv shortlist/page.tsx shortlist/page.tsx.disabled
mv notifications/page.tsx notifications/page.tsx.disabled
```

Puis après le build :
```bash
mv offres/page.tsx.disabled offres/page.tsx
mv onboarding/page.tsx.disabled onboarding/page.tsx.disabled
mv shortlist/page.tsx.disabled shortlist/page.tsx
mv notifications/page.tsx.disabled notifications/page.tsx
```

### Option 3 : Créer des stubs temporaires

Ajouter des fonctions stubs dans `frontend/lib/api.ts` pour permettre le build (les fonctions retourneront des erreurs au runtime).
