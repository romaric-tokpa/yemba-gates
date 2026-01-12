#!/bin/bash
# =============================================================================
# SCRIPT D'INITIALISATION SSL - RECRUTEMENT APP
# =============================================================================
# Usage: ./scripts/init-ssl.sh votre-domaine.com email@example.com

set -e

DOMAIN=${1:-example.com}
EMAIL=${2:-admin@example.com}

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$(dirname "$0")/.."

# Vérifier les arguments
if [ "$DOMAIN" == "example.com" ]; then
    log_error "Veuillez spécifier votre domaine"
    echo "Usage: $0 votre-domaine.com email@example.com"
    exit 1
fi

log_info "Initialisation SSL pour $DOMAIN..."

# Créer les répertoires
mkdir -p certbot/conf certbot/www

# Remplacer le domaine dans la config nginx
sed -i.bak "s/example.com/$DOMAIN/g" nginx/conf.d/default.conf
log_success "Configuration nginx mise à jour"

# Démarrer nginx temporairement pour le challenge
log_info "Démarrage de nginx pour le challenge ACME..."

# Créer une config nginx temporaire pour le challenge
cat > nginx/conf.d/temp.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Démarrer nginx
docker compose up -d nginx

sleep 5

# Obtenir le certificat
log_info "Obtention du certificat SSL..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Supprimer la config temporaire
rm nginx/conf.d/temp.conf

# Redémarrer nginx avec la vraie config
docker compose down
log_success "Certificat SSL obtenu avec succès!"

log_info "Vous pouvez maintenant déployer avec: ./scripts/deploy.sh prod"
