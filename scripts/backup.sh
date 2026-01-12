#!/bin/bash
# =============================================================================
# SCRIPT DE SAUVEGARDE - RECRUTEMENT APP
# =============================================================================
# Usage: ./scripts/backup.sh

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="recrutement_backup_$DATE"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

cd "$(dirname "$0")/.."

# Créer le répertoire de backup
mkdir -p "$BACKUP_DIR"

log_info "Démarrage de la sauvegarde..."

# Sauvegarde de la base de données
log_info "Sauvegarde de la base de données..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-recrutement}" "${POSTGRES_DB:-recrutement_db}" > "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
log_success "Base de données sauvegardée"

# Sauvegarde des fichiers uploadés
log_info "Sauvegarde des fichiers uploadés..."
docker compose cp backend:/app/uploads "$BACKUP_DIR/${BACKUP_NAME}_uploads" 2>/dev/null || \
    cp -r backend/uploads "$BACKUP_DIR/${BACKUP_NAME}_uploads" 2>/dev/null || true
log_success "Fichiers uploadés sauvegardés"

# Compression
log_info "Compression de la sauvegarde..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
    -C "$BACKUP_DIR" \
    "${BACKUP_NAME}_db.sql" \
    "${BACKUP_NAME}_uploads" 2>/dev/null || \
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
    -C "$BACKUP_DIR" \
    "${BACKUP_NAME}_db.sql"

# Nettoyage des fichiers temporaires
rm -f "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
rm -rf "$BACKUP_DIR/${BACKUP_NAME}_uploads"

log_success "Sauvegarde terminée: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"

# Supprimer les anciennes sauvegardes (garder les 7 dernières)
log_info "Nettoyage des anciennes sauvegardes..."
ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

log_success "Sauvegarde complète!"
