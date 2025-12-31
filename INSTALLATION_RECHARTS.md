# Installation de Recharts

## ✅ Correction effectuée

Le package `recharts` a été ajouté au `package.json` mais n'a pas pu être installé automatiquement à cause de restrictions de permissions.

## 📦 Installation manuelle requise

Pour installer `recharts`, exécutez la commande suivante dans le terminal :

```bash
cd frontend
npm install recharts
```

Ou depuis la racine du projet :

```bash
cd /Users/tokpa/Documents/recrutement-app/frontend
npm install recharts
```

## ✅ Vérification

Après l'installation, vérifiez que `recharts` est bien présent dans `package.json` :

```json
"dependencies": {
  ...
  "recharts": "^2.10.3",
  ...
}
```

## 🔍 Problème résolu

Une fois `recharts` installé, l'erreur suivante disparaîtra :
```
Module not found: Can't resolve 'recharts'
```

Le dashboard Manager pourra alors afficher les graphiques correctement.

