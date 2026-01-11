# 🐳 Guide Docker

Ce guide explique comment lancer le projet avec Docker et Docker Compose.

## 📋 Prérequis

- Docker installé (version 20.10 ou supérieure)
- Docker Compose installé (version 2.0 ou supérieure)

Pour vérifier votre installation :
```bash
docker --version
docker-compose --version
```

## 🚀 Démarrage rapide

### 1. Lancer tous les services

Depuis la racine du projet :
```bash
docker-compose up -d
```

Cette commande va :
- Créer et démarrer la base de données PostgreSQL
- Construire et démarrer le backend FastAPI
- Construire et démarrer le frontend Next.js

### 2. Vérifier que les services sont actifs

```bash
docker-compose ps
```

Vous devriez voir trois services : `db`, `backend`, et `frontend` avec le statut "Up".

### 3. Accéder à l'application

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **Documentation API (Swagger)** : http://localhost:8000/docs
- **Base de données** : localhost:5432

## 🛠️ Commandes utiles

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Arrêter les services

```bash
# Arrêter les services (sans supprimer les conteneurs)
docker-compose stop

# Arrêter et supprimer les conteneurs
docker-compose down

# Arrêter, supprimer les conteneurs et les volumes (⚠️ supprime les données)
docker-compose down -v
```

### Redémarrer un service

```bash
# Redémarrer le backend
docker-compose restart backend

# Redémarrer le frontend
docker-compose restart frontend
```

### Reconstruire les images

Si vous avez modifié le code et souhaitez reconstruire les images :

```bash
# Reconstruire toutes les images
docker-compose build

# Reconstruire une image spécifique
docker-compose build backend
docker-compose build frontend

# Reconstruire et relancer
docker-compose up -d --build
```

### Exécuter des commandes dans un conteneur

```bash
# Accéder au shell du backend
docker-compose exec backend sh

# Accéder au shell de la base de données
docker-compose exec db psql -U postgres -d recrutement_db

# Exécuter une migration (exemple)
docker-compose exec backend python -m alembic upgrade head
```

## 🔧 Configuration

### Variables d'environnement

Les variables d'environnement sont définies dans `docker-compose.yml`. Pour les modifier :

1. Modifier directement `docker-compose.yml` pour un changement permanent
2. Ou créer un fichier `.env` à la racine avec vos valeurs

### Ports

Les ports par défaut sont :
- Frontend : 3000
- Backend : 8000
- PostgreSQL : 5432

Pour changer les ports, modifiez la section `ports` dans `docker-compose.yml`.

## 📦 Volumes

Les volumes Docker sont utilisés pour :
- **postgres_data** : Persister les données de la base de données PostgreSQL
- **uploads** : Partager les fichiers uploadés entre le conteneur et l'hôte
- **static** : Partager les fichiers statiques

## ⚠️ Erreurs de build courantes

### Erreurs de compilation TypeScript

Si le build frontend échoue avec des erreurs comme "Export doesn't exist in target module", cela signifie que des fonctions/types sont utilisés mais non définis dans `frontend/lib/api.ts`.

**Solutions :**
1. Consultez `DOCKER_BUILD_ERRORS.md` pour la liste des fonctions manquantes
2. Ajoutez les fonctions manquantes dans `frontend/lib/api.ts`
3. Ou désactivez temporairement les pages problématiques pour permettre le build

## 🐛 Dépannage

### Les services ne démarrent pas

1. Vérifier les logs :
   ```bash
   docker-compose logs
   ```

2. Vérifier que les ports ne sont pas déjà utilisés :
   ```bash
   lsof -i :3000
   lsof -i :8000
   lsof -i :5432
   ```

### La base de données n'est pas initialisée

Le schéma SQL est automatiquement exécuté au premier démarrage. Si ce n'est pas le cas :

```bash
# Se connecter à la base de données
docker-compose exec db psql -U postgres -d recrutement_db

# Ou exécuter le schéma manuellement
docker-compose exec -T db psql -U postgres -d recrutement_db < schema.sql
```

### Reconstruire depuis zéro

Si vous rencontrez des problèmes et souhaitez tout reconstruire :

```bash
# Arrêter et supprimer tout
docker-compose down -v

# Supprimer les images
docker-compose rm -f

# Reconstruire et relancer
docker-compose up -d --build
```

## 🔄 Mode développement

Pour le développement, vous pouvez utiliser Docker uniquement pour la base de données :

```bash
# Lancer uniquement la base de données
docker-compose up -d db

# Lancer le backend localement
cd backend
uvicorn main:app --reload

# Lancer le frontend localement (dans un autre terminal)
cd frontend
npm run dev
```

## 📝 Notes

- La base de données est initialisée automatiquement avec le schéma SQL au premier démarrage
- Les fichiers uploadés sont persistés dans `backend/uploads` et `backend/static`
- Les données de la base de données sont persistées dans le volume Docker `postgres_data`
