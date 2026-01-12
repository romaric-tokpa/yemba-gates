#!/bin/bash
# =============================================================================
# SCRIPT DE DÉPLOIEMENT - RECRUTEMENT APP
# =============================================================================
# Usage: ./scripts/deploy.sh [dev|prod]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi

    log_success "Prérequis vérifiés"
}

# Vérifier le fichier .env
check_env() {
    if [ ! -f ".env" ]; then
        log_error "Fichier .env non trouvé!"
        log_info "Copiez .env.example vers .env et configurez les variables"
        exit 1
    fi
    log_success "Fichier .env trouvé"
}

# Déploiement développement
deploy_dev() {
    log_info "Déploiement en mode DÉVELOPPEMENT..."

    # Copier la config nginx dev si nécessaire
    if [ ! -f "nginx/conf.d/default.conf" ] || [ -f "nginx/conf.d/default.conf" ]; then
        cp nginx/conf.d/dev.conf.example nginx/conf.d/default.conf 2>/dev/null || true
    fi

    # Build et démarrage
    docker compose build
    docker compose up -d db backend frontend

    log_success "Application démarrée en mode développement"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend: http://localhost:8000"
    log_info "API Docs: http://localhost:8000/docs"
}

# Déploiement production
deploy_prod() {
    log_info "Déploiement en mode PRODUCTION..."

    # Vérifier les certificats SSL
    if [ ! -d "certbot/conf/live" ]; then
        log_warning "Certificats SSL non trouvés. Exécutez d'abord ./scripts/init-ssl.sh"
    fi

    # Build et démarrage avec le profil production
    docker compose --profile production build
    docker compose --profile production up -d

    log_success "Application démarrée en mode production"
}

# Arrêter l'application
stop_app() {
    log_info "Arrêt de l'application..."
    docker compose --profile production down
    log_success "Application arrêtée"
}

# Voir les logs
show_logs() {
    docker compose logs -f
}

# Afficher l'aide
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev      Déployer en mode développement"
    echo "  prod     Déployer en mode production"
    echo "  stop     Arrêter l'application"
    echo "  logs     Afficher les logs"
    echo "  status   Afficher le status des conteneurs"
    echo "  help     Afficher cette aide"
}

# Status des conteneurs
show_status() {
    docker compose ps
}

# Point d'entrée
main() {
    cd "$(dirname "$0")/.."

    check_prerequisites
    check_env

    case "${1:-dev}" in
        dev)
            deploy_dev
            ;;
        prod)
            deploy_prod
            ;;
        stop)
            stop_app
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Commande inconnue: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
