#!/bin/bash

# Script pour vérifier que le backend et le frontend tournent sans erreur

echo "🔍 Vérification des serveurs..."
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier le backend (FastAPI)
echo "📡 Vérification du backend (FastAPI sur http://localhost:8000)..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)

if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend: OK (Status: $BACKEND_STATUS)${NC}"
    # Afficher les informations de l'API
    echo "   Endpoint: http://localhost:8000"
    echo "   Docs: http://localhost:8000/docs"
else
    echo -e "${RED}❌ Backend: ERREUR (Status: $BACKEND_STATUS)${NC}"
    echo "   Le serveur backend ne répond pas correctement"
    echo "   Vérifiez que le serveur est démarré avec: cd backend && uvicorn main:app --reload"
fi

echo ""

# Vérifier le frontend (Next.js)
echo "🌐 Vérification du frontend (Next.js sur http://localhost:3000)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
    echo -e "${GREEN}✅ Frontend: OK (Status: $FRONTEND_STATUS)${NC}"
    echo "   Endpoint: http://localhost:3000"
else
    echo -e "${RED}❌ Frontend: ERREUR (Status: $FRONTEND_STATUS)${NC}"
    echo "   Le serveur frontend ne répond pas correctement"
    echo "   Vérifiez que le serveur est démarré avec: cd frontend && npm run dev"
fi

echo ""

# Vérifier la connexion entre frontend et backend
if [ "$BACKEND_STATUS" = "200" ] && [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
    echo "🔗 Test de connexion frontend → backend..."
    API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null)
    if [ "$API_TEST" = "200" ]; then
        echo -e "${GREEN}✅ Connexion API: OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Connexion API: Problème potentiel${NC}"
    fi
fi

echo ""
echo "📋 Résumé:"
if [ "$BACKEND_STATUS" = "200" ] && ([ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]); then
    echo -e "${GREEN}✅ Tous les serveurs fonctionnent correctement${NC}"
    exit 0
else
    echo -e "${RED}❌ Certains serveurs ont des problèmes${NC}"
    exit 1
fi







