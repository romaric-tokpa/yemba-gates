# Démarrage du serveur backend

## Méthode 1 : Depuis le répertoire backend

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Méthode 2 : Depuis la racine du projet

```bash
# Depuis la racine du projet
cd /Users/tokpa/Documents/recrutement-app
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Méthode 3 : Utiliser le script de démarrage

```bash
cd backend
./start_server.sh
```

## Note importante

Le serveur backend doit être démarré depuis le répertoire `backend/` ou en utilisant le chemin `backend.main:app` pour que Python puisse résoudre correctement les imports.
