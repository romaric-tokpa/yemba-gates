# 🚀 Guide de démarrage rapide

## Démarrage du serveur backend

### ⚠️ IMPORTANT : Vous devez être dans le répertoire `backend/` !

**Méthode recommandée :**

```bash
cd backend
uvicorn main:app --reload
```

**Ou en une seule ligne depuis la racine :**

```bash
cd backend && uvicorn main:app --reload
```

**Alternative : Utiliser le script de démarrage (depuis la racine) :**

```bash
./start_backend.sh
```

**Alternative : Utiliser le paramètre --app-dir (uvicorn >= 0.20.0) :**

```bash
uvicorn backend.main:app --reload --app-dir backend
```

## Pourquoi cette erreur se produit ?

L'erreur `Could not import module "main"` se produit quand vous lancez uvicorn depuis la racine du projet car :

1. Le fichier `main.py` est dans le répertoire `backend/`
2. Les imports relatifs (`from database import ...`, `from routers import ...`) nécessitent d'être exécutés depuis `backend/`
3. Uvicorn cherche le module `main` dans le répertoire courant

## Solution définitive

**Toujours se déplacer dans `backend/` avant de lancer uvicorn :**

```bash
cd backend
uvicorn main:app --reload
```

C'est la méthode la plus fiable et recommandée.


