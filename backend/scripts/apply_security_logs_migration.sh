#!/bin/bash

# ============================================
# Script pour appliquer la migration security_logs
# ============================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Migration: Ajout de company_id à security_logs${NC}"
echo "================================================"

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration par défaut
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
ADMIN_DB="${ADMIN_DB:-postgres}"

# Demander le mot de passe si non défini
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Mot de passe PostgreSQL pour $DB_USER:${NC}"
    read -s DB_PASSWORD
    export PGPASSWORD="$DB_PASSWORD"
else
    export PGPASSWORD="$DB_PASSWORD"
fi

MIGRATION_FILE="backend/migrations/add_company_id_to_security_logs.sql"

echo ""
echo -e "${YELLOW}Options:${NC}"
echo "1. Appliquer à une base de données spécifique"
echo "2. Appliquer à toutes les bases de données tenant"
echo -e "${YELLOW}Choisir une option (1 ou 2):${NC}"
read -r option

if [ "$option" = "1" ]; then
    echo -e "${YELLOW}Nom de la base de données:${NC}"
    read -r db_name
    
    echo ""
    echo -e "${YELLOW}Application de la migration à $db_name...${NC}"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -f "$MIGRATION_FILE"; then
        echo -e "${GREEN}✓ Migration appliquée avec succès à $db_name${NC}"
    else
        echo -e "${RED}✗ Erreur lors de l'application de la migration à $db_name${NC}"
        exit 1
    fi
elif [ "$option" = "2" ]; then
    echo ""
    echo -e "${YELLOW}Récupération de la liste des bases de données tenant...${NC}"
    
    # Récupérer la liste des bases de données tenant depuis MASTER_DB
    MASTER_DB="${MASTER_DB:-yemma_gates_master}"
    
    if [ -z "$MASTER_DB" ]; then
        echo -e "${RED}✗ MASTER_DB n'est pas défini${NC}"
        exit 1
    fi
    
    # Récupérer les noms des bases de données tenant
    TENANT_DBS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$MASTER_DB" -t -c "SELECT database_name FROM tenant_databases;" | tr -d ' ')
    
    if [ -z "$TENANT_DBS" ]; then
        echo -e "${YELLOW}Aucune base de données tenant trouvée${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}Bases de données trouvées:${NC}"
    echo "$TENANT_DBS" | while read -r db; do
        if [ -n "$db" ]; then
            echo "  - $db"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}Appliquer la migration à toutes ces bases? (o/n):${NC}"
    read -r confirm
    
    if [ "$confirm" != "o" ] && [ "$confirm" != "O" ]; then
        echo -e "${YELLOW}Annulé${NC}"
        exit 0
    fi
    
    success_count=0
    error_count=0
    
    echo "$TENANT_DBS" | while read -r db; do
        if [ -n "$db" ]; then
            echo ""
            echo -e "${YELLOW}Application de la migration à $db...${NC}"
            
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$MIGRATION_FILE" 2>&1; then
                echo -e "${GREEN}✓ Migration appliquée avec succès à $db${NC}"
                success_count=$((success_count + 1))
            else
                echo -e "${RED}✗ Erreur lors de l'application de la migration à $db${NC}"
                error_count=$((error_count + 1))
            fi
        fi
    done
    
    echo ""
    echo "================================================"
    echo -e "${GREEN}Résultat:${NC}"
    echo -e "  Succès: $success_count"
    echo -e "  Erreurs: $error_count"
else
    echo -e "${RED}Option invalide${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Migration terminée${NC}"
