#!/bin/bash

# Script pour démarrer l'application avec accès public via tunnel
# Ce script utilise un seul tunnel et configure le backend pour être accessible via le même tunnel

TUNNEL_TYPE=${1:-cloudflare}
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo "🚀 Démarrage de l'application avec accès public..."
echo "📡 Type de tunnel: $TUNNEL_TYPE"
echo ""

# Vérifier que nous sommes à la racine du projet
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Erreur: Ce script doit être exécuté à la racine du projet"
    exit 1
fi

# Fonction pour nettoyer
cleanup() {
    echo ""
    echo "🛑 Arrêt des processus..."
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    [ ! -z "$TUNNEL_PID" ] && kill $TUNNEL_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Activer l'environnement virtuel
if [ -d "backend/.venv" ]; then
    source backend/.venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Démarrer le backend
echo "🔧 Démarrage du backend sur le port $BACKEND_PORT..."
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 3

# Démarrer le frontend
echo "🌐 Démarrage du frontend sur le port $FRONTEND_PORT..."
cd frontend
HOSTNAME=0.0.0.0 PORT=$FRONTEND_PORT npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 5

# Démarrer le tunnel pour le frontend
echo "🌍 Démarrage du tunnel..."
case $TUNNEL_TYPE in
    cloudflare)
        if ! command -v cloudflared &> /dev/null; then
            echo "❌ cloudflared n'est pas installé"
            echo "   Installez-le avec: brew install cloudflare/cloudflare/cloudflared"
            cleanup
            exit 1
        fi
        cloudflared tunnel --url http://localhost:$FRONTEND_PORT > tunnel.log 2>&1 &
        TUNNEL_PID=$!
        ;;
    localtunnel)
        if ! command -v lt &> /dev/null; then
            echo "❌ localtunnel n'est pas installé"
            echo "   Installez-le avec: npm install -g localtunnel"
            cleanup
            exit 1
        fi
        lt --port $FRONTEND_PORT > tunnel.log 2>&1 &
        TUNNEL_PID=$!
        ;;
    *)
        echo "❌ Type de tunnel inconnu: $TUNNEL_TYPE"
        echo "   Types supportés: cloudflare, localtunnel"
        cleanup
        exit 1
        ;;
esac

echo ""
echo "⏳ Attente du démarrage du tunnel (15 secondes)..."
sleep 15

# Extraire l'URL
echo "🔍 Récupération de l'URL du tunnel..."

if [ "$TUNNEL_TYPE" = "cloudflare" ]; then
    FRONTEND_URL=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' tunnel.log 2>/dev/null | head -1)
    echo ""
    echo "💡 Pour le backend, créez un deuxième tunnel dans un autre terminal:"
    echo "   cloudflared tunnel --url http://localhost:8000"
elif [ "$TUNNEL_TYPE" = "localtunnel" ]; then
    FRONTEND_URL=$(grep -Eo 'https://[a-z0-9-]+\.loca\.lt' tunnel.log 2>/dev/null | head -1)
    echo ""
    echo "💡 Pour le backend, créez un deuxième tunnel dans un autre terminal:"
    echo "   lt --port 8000"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Application démarrée!"
echo "═══════════════════════════════════════════════════════════"
echo ""
if [ ! -z "$FRONTEND_URL" ]; then
    echo "📱 URL Frontend (accessible depuis n'importe où):"
    echo "   $FRONTEND_URL"
    echo ""
    echo "🔧 Configuration Backend:"
    echo "   1. Créez un deuxième tunnel pour le backend (voir instructions ci-dessus)"
    echo "   2. Configurez l'URL dans sessionStorage:"
    echo "      sessionStorage.setItem('TUNNEL_BACKEND_URL', 'URL_DU_BACKEND')"
    echo "   3. Ou créez frontend/.env.local avec:"
    echo "      NEXT_PUBLIC_API_URL=URL_DU_BACKEND"
else
    echo "⚠️  URL non détectée automatiquement"
    echo "   Vérifiez les logs: cat tunnel.log"
fi
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 PIDs: Backend=$BACKEND_PID, Frontend=$FRONTEND_PID, Tunnel=$TUNNEL_PID"
echo "🛑 Pour arrêter: Ctrl+C"
echo ""

wait

