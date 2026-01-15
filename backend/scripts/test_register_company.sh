#!/bin/bash
# Script pour tester l'endpoint /api/auth/register-company

set -e

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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Vérifier que le serveur est démarré
check_server() {
    print_step "Vérification du serveur"
    
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Serveur accessible sur http://localhost:8000"
        return 0
    else
        print_error "Serveur non accessible. Démarrez-le avec: cd backend && python -m uvicorn main:app --reload"
        return 1
    fi
}

# Test 1: Inscription basique
test_basic_registration() {
    print_step "TEST 1: Inscription Basique"
    
    TIMESTAMP=$(date +%s)
    PAYLOAD=$(cat <<EOF
{
  "company_name": "Test Company $TIMESTAMP",
  "company_email": "test$TIMESTAMP@company.com",
  "company_phone": "+221 77 123 45 67",
  "country": "Sénégal",
  "industry": "Technologie",
  "company_size": "medium",
  "admin_first_name": "Jean",
  "admin_last_name": "Dupont",
  "admin_email": "admin$TIMESTAMP@test.com",
  "admin_password": "SecurePassword123!"
}
EOF
)
    
    print_info "Envoi de la requête..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/auth/register-company \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" -eq 201 ]; then
        print_success "Inscription réussie (HTTP $HTTP_CODE)"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
        
        # Extraire company_id
        COMPANY_ID=$(echo "$BODY" | grep -o '"company_id": "[^"]*"' | cut -d'"' -f4)
        ACCESS_TOKEN=$(echo "$BODY" | grep -o '"access_token": "[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$COMPANY_ID" ]; then
            echo "$COMPANY_ID" > /tmp/test_company_id.txt
            print_success "Company ID: $COMPANY_ID"
            print_info "Token généré: ${ACCESS_TOKEN:0:50}..."
        fi
        return 0
    else
        print_error "Échec de l'inscription (HTTP $HTTP_CODE)"
        echo "$BODY"
        return 1
    fi
}

# Test 2: Vérifier dans MASTER_DB
test_master_db() {
    print_step "TEST 2: Vérification dans MASTER_DB"
    
    if [ ! -f /tmp/test_company_id.txt ]; then
        print_error "Company ID non trouvé"
        return 1
    fi
    
    COMPANY_ID=$(cat /tmp/test_company_id.txt)
    
    print_info "Vérification de l'entreprise dans MASTER_DB..."
    RESULT=$(psql -U postgres -d yemma_gates_master -t -c "
        SELECT 
            id::text,
            name,
            contact_email,
            subdomain,
            status
        FROM companies 
        WHERE id = '$COMPANY_ID'::uuid;
    " 2>&1)
    
    if echo "$RESULT" | grep -q "$COMPANY_ID"; then
        print_success "Entreprise trouvée dans MASTER_DB"
        echo "$RESULT"
        
        # Vérifier TenantDatabase
        print_info "Vérification du TenantDatabase..."
        TENANT_DB=$(psql -U postgres -d yemma_gates_master -t -c "
            SELECT db_name FROM tenant_databases WHERE company_id = '$COMPANY_ID'::uuid;
        " 2>&1 | tr -d ' ')
        
        if [ -n "$TENANT_DB" ]; then
            print_success "TenantDatabase trouvé: $TENANT_DB"
            echo "$TENANT_DB" > /tmp/test_db_name.txt
            
            # Vérifier Subscription
            print_info "Vérification de la Subscription..."
            SUBSCRIPTION=$(psql -U postgres -d yemma_gates_master -t -c "
                SELECT s.status, p.name 
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.company_id = '$COMPANY_ID'::uuid;
            " 2>&1)
            
            if echo "$SUBSCRIPTION" | grep -q "trial"; then
                print_success "Subscription trouvée avec statut trial"
                echo "$SUBSCRIPTION"
            else
                print_error "Subscription non trouvée ou incorrecte"
                return 1
            fi
        else
            print_error "TenantDatabase non trouvé"
            return 1
        fi
        return 0
    else
        print_error "Entreprise non trouvée dans MASTER_DB"
        echo "$RESULT"
        return 1
    fi
}

# Test 3: Vérifier la base de données créée
test_tenant_database() {
    print_step "TEST 3: Vérification de la Base de Données Créée"
    
    if [ ! -f /tmp/test_db_name.txt ]; then
        print_error "Nom de base de données non trouvé"
        return 1
    fi
    
    DB_NAME=$(cat /tmp/test_db_name.txt)
    
    print_info "Vérification de l'existence de la base PostgreSQL: $DB_NAME"
    RESULT=$(psql -U postgres -lqt 2>&1 | grep -w "$DB_NAME")
    
    if [ -n "$RESULT" ]; then
        print_success "Base de données PostgreSQL créée: $DB_NAME"
        
        # Vérifier les tables
        print_info "Vérification des tables..."
        TABLES=$(psql -U postgres -d "$DB_NAME" -t -c "
            SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
        " 2>&1)
        
        if echo "$TABLES" | grep -q "users"; then
            print_success "Tables créées dans la base"
            echo "$TABLES" | head -10
        else
            print_error "Tables non trouvées"
            return 1
        fi
        return 0
    else
        print_error "Base de données PostgreSQL non créée"
        return 1
    fi
}

# Test 4: Vérifier l'utilisateur admin
test_admin_user() {
    print_step "TEST 4: Vérification de l'Utilisateur Admin"
    
    if [ ! -f /tmp/test_db_name.txt ] || [ ! -f /tmp/test_company_id.txt ]; then
        print_error "Informations manquantes"
        return 1
    fi
    
    DB_NAME=$(cat /tmp/test_db_name.txt)
    COMPANY_ID=$(cat /tmp/test_company_id.txt)
    
    print_info "Vérification de l'utilisateur admin dans la base: $DB_NAME"
    
    USER=$(psql -U postgres -d "$DB_NAME" -t -c "
        SELECT 
            id::text,
            email,
            first_name,
            last_name,
            role,
            company_id::text
        FROM users 
        WHERE role = 'administrateur'
        LIMIT 1;
    " 2>&1)
    
    if echo "$USER" | grep -q "administrateur"; then
        print_success "Utilisateur admin trouvé"
        echo "$USER"
        
        # Vérifier que company_id correspond
        if echo "$USER" | grep -q "$COMPANY_ID"; then
            print_success "Company ID correspond: $COMPANY_ID"
            return 0
        else
            print_error "Company ID ne correspond pas"
            return 1
        fi
    else
        print_error "Utilisateur admin non trouvé"
        return 1
    fi
}

# Test 5: Test de duplication (doit échouer)
test_duplicate_email() {
    print_step "TEST 5: Test de Duplication (Doit Échouer)"
    
    TIMESTAMP=$(date +%s)
    PAYLOAD=$(cat <<EOF
{
  "company_name": "Duplicate Test $TIMESTAMP",
  "company_email": "duplicate$TIMESTAMP@test.com",
  "admin_first_name": "Jean",
  "admin_last_name": "Dupont",
  "admin_email": "admin$TIMESTAMP@test.com",
  "admin_password": "SecurePassword123!"
}
EOF
)
    
    # Première inscription (doit réussir)
    print_info "Première inscription..."
    RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/auth/register-company \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
    
    if [ "$HTTP_CODE1" -eq 201 ]; then
        print_success "Première inscription réussie"
        COMPANY_ID1=$(echo "$RESPONSE1" | sed '$d' | grep -o '"company_id": "[^"]*"' | cut -d'"' -f4)
        echo "$COMPANY_ID1" > /tmp/test_company_id_duplicate.txt
        
        # Deuxième inscription avec le même email (doit échouer)
        print_info "Deuxième inscription avec email dupliqué (doit échouer)..."
        PAYLOAD2=$(echo "$PAYLOAD" | sed "s/Duplicate Test/Different Name/")
        
        RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/auth/register-company \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD2")
        
        HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
        BODY2=$(echo "$RESPONSE2" | sed '$d')
        
        if [ "$HTTP_CODE2" -eq 400 ]; then
            print_success "Duplication correctement détectée (HTTP 400)"
            echo "$BODY2" | python3 -m json.tool 2>/dev/null || echo "$BODY2"
            return 0
        else
            print_error "Duplication non détectée (HTTP $HTTP_CODE2)"
            return 1
        fi
    else
        print_error "Première inscription a échoué"
        return 1
    fi
}

# Test 6: Test mot de passe faible
test_weak_password() {
    print_step "TEST 6: Test Mot de Passe Faible"
    
    TIMESTAMP=$(date +%s)
    PAYLOAD=$(cat <<EOF
{
  "company_name": "Weak Password Test $TIMESTAMP",
  "company_email": "weak$TIMESTAMP@test.com",
  "admin_first_name": "Jean",
  "admin_last_name": "Dupont",
  "admin_email": "admin$TIMESTAMP@test.com",
  "admin_password": "short"
}
EOF
)
    
    print_info "Tentative avec mot de passe trop court..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/auth/register-company \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" -eq 400 ]; then
        print_success "Mot de passe faible correctement rejeté (HTTP 400)"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
        return 0
    else
        print_error "Mot de passe faible accepté (HTTP $HTTP_CODE)"
        return 1
    fi
}

# Nettoyage
cleanup() {
    print_step "Nettoyage"
    
    if [ -f /tmp/test_company_id.txt ]; then
        COMPANY_ID=$(cat /tmp/test_company_id.txt)
        print_info "Suppression de l'entreprise de test: $COMPANY_ID"
        
        if [ -f /tmp/test_db_name.txt ]; then
            DB_NAME=$(cat /tmp/test_db_name.txt)
            print_info "Suppression de la base de données: $DB_NAME"
            
            # Supprimer la base
            psql -U postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>&1 | grep -v "does not exist" || true
        fi
        
        # Supprimer de MASTER_DB
        psql -U postgres -d yemma_gates_master -c "
            DELETE FROM subscriptions WHERE company_id = '$COMPANY_ID'::uuid;
            DELETE FROM tenant_databases WHERE company_id = '$COMPANY_ID'::uuid;
            DELETE FROM companies WHERE id = '$COMPANY_ID'::uuid;
        " 2>&1 | grep -v "does not exist" || true
        
        print_success "Nettoyage terminé"
    fi
    
    # Nettoyer les fichiers temporaires
    rm -f /tmp/test_company_id.txt /tmp/test_db_name.txt /tmp/test_company_id_duplicate.txt
}

# Fonction principale
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║         TESTS D'INSCRIPTION D'ENTREPRISE                                    ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Vérifier le serveur
    if ! check_server; then
        exit 1
    fi
    
    # Exécuter les tests
    TESTS_PASSED=0
    TESTS_FAILED=0
    
    # Test 1
    if test_basic_registration; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test 2
    if test_master_db; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test 3
    if test_tenant_database; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test 4
    if test_admin_user; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test 5
    if test_duplicate_email; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test 6
    if test_weak_password; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Nettoyage
    cleanup
    
    # Résumé
    print_step "Résumé des Tests"
    echo "Tests réussis: $TESTS_PASSED"
    echo "Tests échoués: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                    ✅ TOUS LES TESTS SONT PASSÉS!                            ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}\n"
        exit 0
    else
        echo -e "\n${RED}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                  ❌ CERTAINS TESTS ONT ÉCHOUÉ                                 ║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════════════════════════════════════════╝${NC}\n"
        exit 1
    fi
}

# Exécuter
main
