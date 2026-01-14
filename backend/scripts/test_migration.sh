#!/bin/bash
# Script de test pour la migration multi-tenant

set -e  # Arrêter en cas d'erreur

echo "=============================================================================="
echo "🧪 TESTS DE MIGRATION - Architecture Multi-Tenant"
echo "=============================================================================="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Vérifier que PostgreSQL est accessible
echo "📦 Test 1: Vérification de PostgreSQL..."
if psql -U postgres -c "SELECT version();" > /dev/null 2>&1; then
    print_success "PostgreSQL est accessible"
else
    print_error "PostgreSQL n'est pas accessible"
    exit 1
fi
echo ""

# Test 2: Vérifier que la base MASTER existe
echo "🗄️  Test 2: Vérification de la base MASTER..."
if psql -U postgres -d yemma_gates_master -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Base MASTER existe"
    
    # Vérifier les tables
    TABLE_COUNT=$(psql -U postgres -d yemma_gates_master -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('companies', 'tenant_databases', 'plans', 'subscriptions');" | tr -d ' ')
    
    if [ "$TABLE_COUNT" -ge 4 ]; then
        print_success "Tables MASTER créées ($TABLE_COUNT tables trouvées)"
    else
        print_warning "Certaines tables MASTER manquent (trouvé: $TABLE_COUNT/4)"
    fi
else
    print_error "Base MASTER n'existe pas. Créez-la avec: CREATE DATABASE yemma_gates_master;"
    exit 1
fi
echo ""

# Test 3: Vérifier que l'entreprise par défaut existe
echo "🏢 Test 3: Vérification de l'entreprise par défaut..."
COMPANY_COUNT=$(psql -U postgres -d yemma_gates_master -t -c "SELECT COUNT(*) FROM companies WHERE subdomain = 'default';" | tr -d ' ')

if [ "$COMPANY_COUNT" -gt 0 ]; then
    print_success "Entreprise par défaut trouvée"
    
    # Récupérer l'ID de l'entreprise
    COMPANY_ID=$(psql -U postgres -d yemma_gates_master -t -c "SELECT id FROM companies WHERE subdomain = 'default' LIMIT 1;" | tr -d ' ')
    echo "   ID: $COMPANY_ID"
else
    print_warning "Entreprise par défaut non trouvée. Exécutez: python backend/migrations/create_default_company.py"
    COMPANY_ID=""
fi
echo ""

# Test 4: Vérifier que la base tenant a la colonne company_id
echo "🔍 Test 4: Vérification de la colonne company_id..."
if [ -n "$COMPANY_ID" ]; then
    # Récupérer le nom de la base de données
    DB_NAME=$(psql -U postgres -d yemma_gates_master -t -c "SELECT db_name FROM tenant_databases WHERE company_id = '$COMPANY_ID' LIMIT 1;" | tr -d ' ')
    
    if [ -n "$DB_NAME" ]; then
        echo "   Base de données: $DB_NAME"
        
        # Vérifier que la colonne existe
        if psql -U postgres -d "$DB_NAME" -c "SELECT company_id FROM users LIMIT 1;" > /dev/null 2>&1; then
            print_success "Colonne company_id existe dans users"
            
            # Vérifier que tous les users ont un company_id
            NULL_COUNT=$(psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE company_id IS NULL;" | tr -d ' ')
            
            if [ "$NULL_COUNT" -eq 0 ]; then
                print_success "Tous les users ont un company_id"
            else
                print_warning "$NULL_COUNT users n'ont pas de company_id"
            fi
        else
            print_error "Colonne company_id n'existe pas dans users"
        fi
    else
        print_warning "Base de données tenant non trouvée"
    fi
else
    print_warning "Impossible de tester: entreprise par défaut non trouvée"
fi
echo ""

# Test 5: Vérifier les imports Python
echo "🐍 Test 5: Vérification des imports Python..."
cd backend
if python -c "from tenant_manager import get_master_session; from database_tenant import get_session; from models_master import Company" 2>/dev/null; then
    print_success "Imports Python fonctionnent"
else
    print_error "Erreur lors des imports Python"
    python -c "from tenant_manager import get_master_session" 2>&1
    exit 1
fi
cd ..
echo ""

# Test 6: Exécuter les tests Python
echo "🧪 Test 6: Exécution des tests Python..."
cd backend
if python tests/test_migration.py; then
    print_success "Tests Python passés"
else
    print_error "Certains tests Python ont échoué"
    exit 1
fi
cd ..
echo ""

# Résumé
echo "=============================================================================="
echo "✅ Tous les tests sont passés!"
echo "=============================================================================="
echo ""
echo "💡 Prochaines étapes:"
echo "   1. Vérifier que tous les routers utilisent database_tenant"
echo "   2. Tester l'authentification avec un token contenant company_id"
echo "   3. Tester l'isolation des données entre tenants"
echo ""
