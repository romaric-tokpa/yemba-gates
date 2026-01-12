# Guide de Déploiement - Recrutement App

Ce guide explique comment déployer l'application Recrutement App en production.

## Table des matières

1. [Prérequis](#prérequis)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Déploiement Local (Développement)](#déploiement-local)
5. [Déploiement Production](#déploiement-production)
6. [SSL avec Let's Encrypt](#ssl-avec-lets-encrypt)
7. [Maintenance](#maintenance)
8. [Dépannage](#dépannage)

---

## Prérequis

### Serveur
- **OS**: Ubuntu 22.04 LTS ou similaire
- **RAM**: Minimum 4GB (8GB recommandé)
- **CPU**: 2 vCPUs minimum
- **Stockage**: 20GB minimum

### Logiciels requis
```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose (si pas inclus dans Docker)
sudo apt install docker-compose-plugin
```

### Ports à ouvrir
- **80**: HTTP (redirection vers HTTPS)
- **443**: HTTPS
- **22**: SSH (administration)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                                │
│                   (Reverse Proxy + SSL)                     │
│                    Ports: 80, 443                           │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
                  ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│       FRONTEND          │   │        BACKEND          │
│       (Next.js)         │   │       (FastAPI)         │
│       Port: 3000        │   │       Port: 8000        │
└─────────────────────────┘   └───────────┬─────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │      POSTGRESQL         │
                              │       Port: 5432        │
                              └─────────────────────────┘
```

---

## Configuration

### 1. Cloner le repository

```bash
git clone <votre-repo> recrutement-app
cd recrutement-app
```

### 2. Configurer les variables d'environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

**Variables importantes à configurer:**

```env
# Sécurité (OBLIGATOIRE - générez des valeurs uniques)
SECRET_KEY=votre-cle-secrete-tres-longue
POSTGRES_PASSWORD=mot-de-passe-fort

# Domaine
ALLOWED_ORIGINS=https://votre-domaine.com
LOGIN_URL=https://votre-domaine.com/auth/login
NEXT_PUBLIC_API_URL=https://votre-domaine.com

# Email (pour les notifications)
SMTP_HOST=smtp.gmail.com
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application

# API Gemini (pour l'IA)
GEMINI_API_KEY=votre-cle-api-gemini
```

### 3. Configurer Nginx

Éditez le fichier `nginx/conf.d/default.conf` et remplacez `example.com` par votre domaine:

```bash
sed -i 's/yemma-gates.com/yemma-gates.com/g' nginx/conf.d/default.conf
```

---

## Déploiement Local

Pour tester en développement:

```bash
# Démarrer en mode développement
./scripts/deploy.sh dev

# Vérifier le status
./scripts/deploy.sh status

# Voir les logs
./scripts/deploy.sh logs
```

Accès:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Documentation API: http://localhost:8000/docs

---

## Déploiement Production

### Étape 1: Configuration initiale

```bash
# S'assurer que le fichier .env est configuré
cat .env

# Configurer le domaine dans nginx
sed -i 's/example.com/yemma-gates.com/g' nginx/conf.d/default.conf
```

### Étape 2: Obtenir les certificats SSL

```bash
# Initialiser SSL avec Let's Encrypt
./scripts/init-ssl.sh yemma-gates.com admin@yemma-gates.com
```

### Étape 3: Déployer

```bash
# Déployer en production
./scripts/deploy.sh prod
```

### Étape 4: Vérifier

```bash
# Vérifier que tous les conteneurs sont en cours d'exécution
docker compose ps

# Vérifier les logs
docker compose logs -f
```

---

## SSL avec Let's Encrypt

### Première installation

```bash
./scripts/init-ssl.sh votre-domaine.com admin@votre-domaine.com
```

### Renouvellement automatique

Le conteneur `certbot` renouvelle automatiquement les certificats. Pour forcer un renouvellement:

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

---

## Maintenance

### Sauvegardes

```bash
# Créer une sauvegarde
./scripts/backup.sh

# Les sauvegardes sont stockées dans ./backups/
ls -la backups/
```

### Mise à jour de l'application

```bash
# Arrêter l'application
./scripts/deploy.sh stop

# Mettre à jour le code
git pull origin main

# Reconstruire et redéployer
./scripts/deploy.sh prod
```

### Logs

```bash
# Tous les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f db
```

### Redémarrage des services

```bash
# Redémarrer un service
docker compose restart backend

# Redémarrer tous les services
docker compose restart
```

---

## Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs

# Vérifier le statut des conteneurs
docker compose ps

# Vérifier les variables d'environnement
docker compose config
```

### Erreur de base de données

```bash
# Se connecter à PostgreSQL
docker compose exec db psql -U recrutement -d recrutement_db

# Vérifier les tables
\dt

# Quitter
\q
```

### Erreur SSL

```bash
# Vérifier les certificats
ls -la certbot/conf/live/

# Régénérer les certificats
./scripts/init-ssl.sh votre-domaine.com admin@votre-domaine.com
```

### Problèmes de mémoire

```bash
# Vérifier l'utilisation des ressources
docker stats

# Nettoyer les images inutilisées
docker system prune -a
```

### Réinitialisation complète

```bash
# ATTENTION: Ceci supprime toutes les données!
docker compose down -v
docker system prune -a

# Redéployer
./scripts/deploy.sh prod
```

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `./scripts/deploy.sh dev` | Déployer en développement |
| `./scripts/deploy.sh prod` | Déployer en production |
| `./scripts/deploy.sh stop` | Arrêter l'application |
| `./scripts/deploy.sh logs` | Voir les logs |
| `./scripts/deploy.sh status` | Voir le statut |
| `./scripts/backup.sh` | Créer une sauvegarde |
| `docker compose exec backend bash` | Shell dans le backend |
| `docker compose exec db psql -U recrutement -d recrutement_db` | Console PostgreSQL |

---

## Support

En cas de problème:
1. Vérifiez les logs: `docker compose logs`
2. Consultez ce guide de dépannage
3. Ouvrez une issue sur le repository GitHub

---

## Checklist de déploiement

- [ ] Serveur provisionné avec Docker installé
- [ ] Ports 80 et 443 ouverts
- [ ] DNS configuré pour pointer vers le serveur
- [ ] Fichier `.env` configuré avec toutes les variables
- [ ] `SECRET_KEY` générée de manière sécurisée
- [ ] `POSTGRES_PASSWORD` configuré avec un mot de passe fort
- [ ] Certificats SSL obtenus
- [ ] Application déployée et fonctionnelle
- [ ] Sauvegardes automatiques configurées
