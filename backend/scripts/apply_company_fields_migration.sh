#!/bin/bash
# Script pour appliquer la migration des champs company (country, industry, size)

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         MIGRATION: Ajout des champs company (country, industry, size)      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo

# Vérifier que la base existe
echo -e "${BLUE}▶ Vérification de la base MASTER...${NC}"
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw yemma_gates_master; then
    echo -e "${RED}❌ La base yemma_gates_master n'existe pas!${NC}"
    echo -e "${YELLOW}💡 Créez-la d'abord avec:${NC}"
    echo "   psql -U postgres -c \"CREATE DATABASE yemma_gates_master;\""
    echo "   psql -U postgres -d yemma_gates_master -f backend/schema_master.sql"
    exit 1
fi

echo -e "${GREEN}✅ Base yemma_gates_master trouvée${NC}"
echo

# Appliquer la migration
echo -e "${BLUE}▶ Application de la migration...${NC}"
psql -U postgres -d yemma_gates_master -f backend/migrations/add_company_fields_migration.sql

if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}✅ Migration appliquée avec succès!${NC}"
    echo
    
    # Vérifier les colonnes
    echo -e "${BLUE}▶ Vérification des colonnes...${NC}"
    psql -U postgres -d yemma_gates_master -c "
        SELECT 
            column_name, 
            data_type, 
            character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'companies'
        AND column_name IN ('country', 'industry', 'size')
        ORDER BY column_name;
    "
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                          ✅ MIGRATION TERMINÉE                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${YELLOW}💡 Vous pouvez maintenant tester l'inscription d'entreprise:${NC}"
    echo "   python3 backend/scripts/test_register_simple.py"
else
    echo
    echo -e "${RED}❌ Erreur lors de la migration${NC}"
    exit 1
fi
