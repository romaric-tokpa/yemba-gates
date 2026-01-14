#!/bin/bash
# Script automatisé pour exécuter la migration multi-tenant complète

set -e  # Arrêter en cas d'erreur

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Vérifier que PostgreSQL est accessible
check_postgres() {
    if ! psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
        print_error "PostgreSQL n'est pas accessible. Vérifiez votre connexion."
        exit 1
    fi
    print_success "PostgreSQL est accessible"
}

# Étape 1: Créer la base MASTER
step1_create_master_db() {
    print_step "ÉTAPE 1: Création de la base MASTER"
    
    # Vérifier si la base existe déjà
    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw yemma_gates_master; then
        print_warning "La base yemma_gates_master existe déjà"
        read -p "Voulez-vous la recréer? (o/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Oo]$ ]]; then
            print_info "Suppression de l'ancienne base..."
            psql -U postgres -c "DROP DATABASE IF EXISTS yemma_gates_master;" || true
        else
            print_info "Utilisation de la base existante"
            return 0
        fi
    fi
    
    print_info "Création de la base yemma_gates_master..."
    if psql -U postgres -c "CREATE DATABASE yemma_gates_master;"; then
        print_success "Base MASTER créée"
    else
        print_error "Échec de la création de la base MASTER"
        exit 1
    fi
    
    print_info "Exécution du schéma SQL..."
    if psql -U postgres -d yemma_gates_master -f backend/schema_master.sql; then
        print_success "Schéma MASTER créé"
    else
        print_error "Échec de l'exécution du schéma"
        exit 1
    fi
}

# Étape 2: Créer l'entreprise par défaut
step2_create_default_company() {
    print_step "ÉTAPE 2: Création de l'entreprise par défaut"
    
    # Vérifier que MASTER_DB_URL est configuré
    if [ -z "$MASTER_DB_URL" ]; then
        print_warning "MASTER_DB_URL non défini, utilisation de la valeur par défaut"
        export MASTER_DB_URL="postgresql://postgres:postgres@localhost:5432/yemma_gates_master"
    fi
    
    print_info "Exécution du script de création d'entreprise..."
    if python backend/migrations/create_default_company.py; then
        print_success "Entreprise par défaut créée"
        
        # Récupérer l'ID de l'entreprise
        COMPANY_ID=$(psql -U postgres -d yemma_gates_master -t -c "SELECT id FROM companies WHERE subdomain = 'default' LIMIT 1;" | tr -d ' ')
        if [ -n "$COMPANY_ID" ]; then
            echo "$COMPANY_ID" > /tmp/default_company_id.txt
            print_success "ID de l'entreprise: $COMPANY_ID"
            print_info "Cet ID sera utilisé pour la migration des données"
        fi
    else
        print_error "Échec de la création de l'entreprise par défaut"
        exit 1
    fi
}

# Étape 3: Migrer les données
step3_migrate_data() {
    print_step "ÉTAPE 3: Migration des données existantes"
    
    # Récupérer l'ID de l'entreprise
    if [ -f /tmp/default_company_id.txt ]; then
        COMPANY_ID=$(cat /tmp/default_company_id.txt)
    else
        COMPANY_ID=$(psql -U postgres -d yemma_gates_master -t -c "SELECT id FROM companies WHERE subdomain = 'default' LIMIT 1;" | tr -d ' ')
    fi
    
    if [ -z "$COMPANY_ID" ]; then
        print_error "Impossible de trouver l'ID de l'entreprise par défaut"
        exit 1
    fi
    
    print_info "ID de l'entreprise: $COMPANY_ID"
    print_info "Mise à jour du script de migration avec l'ID de l'entreprise..."
    
    # Créer une copie temporaire du script SQL avec l'ID remplacé
    TEMP_SQL="/tmp/add_company_id_migration_temp.sql"
    sed "s/COMPANY_ID_DEFAULT/'$COMPANY_ID'/g" backend/migrations/add_company_id_migration.sql > "$TEMP_SQL"
    
    # Vérifier que la base recrutement_db existe
    if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw recrutement_db; then
        print_error "La base recrutement_db n'existe pas"
        exit 1
    fi
    
    print_warning "⚠️  ATTENTION: Cette opération va modifier votre base de données"
    print_warning "⚠️  Assurez-vous d'avoir fait un backup avant de continuer"
    read -p "Continuer? (o/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        print_info "Migration annulée par l'utilisateur"
        rm -f "$TEMP_SQL"
        exit 0
    fi
    
    print_info "Exécution de la migration SQL (ajout des colonnes)..."
    if psql -U postgres -d recrutement_db -f "$TEMP_SQL" 2>&1 | grep -v "already exists" | grep -v "does not exist"; then
        print_success "Colonnes company_id ajoutées"
    else
        print_warning "Certaines colonnes existent peut-être déjà (normal si re-exécution)"
    fi
    rm -f "$TEMP_SQL"
    
    # Utiliser le script Python pour migrer les données
    print_info "Migration des données avec company_id (script Python)..."
    if python backend/migrations/migrate_data_with_company_id.py; then
        print_success "Données migrées"
    else
        print_error "Échec de la migration des données"
        exit 1
    fi
}

# Étape 4: Mettre à jour les routers
step4_update_routers() {
    print_step "ÉTAPE 4: Mise à jour des routers"
    
    print_info "Exécution du script de mise à jour..."
    if python backend/migrations/update_routers_for_tenant.py; then
        print_success "Routers mis à jour"
    else
        print_error "Échec de la mise à jour des routers"
        exit 1
    fi
}

# Étape 5: Optimiser les KPI (optionnel)
step5_optimize_kpi() {
    print_step "ÉTAPE 5: Optimisation des index KPI (optionnel)"
    
    read -p "Voulez-vous créer les index pour optimiser les KPI? (O/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "Création des index pour les KPI..."
        if psql -U postgres -d recrutement_db -f backend/migrations/optimize_kpi_indexes.sql; then
            print_success "Index KPI créés"
        else
            print_warning "Certains index n'ont pas pu être créés (peut-être déjà existants)"
        fi
    else
        print_info "Optimisation KPI ignorée"
    fi
}

# Fonction principale
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║         MIGRATION AUTOMATISÉE - Architecture Multi-Tenant                  ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Vérifications préalables
    print_info "Vérification des prérequis..."
    check_postgres
    
    # Exécuter les étapes
    step1_create_master_db
    step2_create_default_company
    step3_migrate_data
    step4_update_routers
    step5_optimize_kpi
    
    # Résumé final
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ MIGRATION TERMINÉE AVEC SUCCÈS                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}\n"
    
    print_info "Prochaines étapes:"
    echo "  1. Vérifier que le serveur démarre: cd backend && python -m uvicorn main:app --reload"
    echo "  2. Tester l'authentification: curl -X POST http://localhost:8000/auth/login ..."
    echo "  3. Vérifier l'isolation: créer deux entreprises et tester l'accès"
    echo ""
    print_info "Pour tester la migration: ./backend/scripts/test_migration.sh"
}

# Exécuter
main
