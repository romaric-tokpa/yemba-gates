#!/bin/bash

# Script pour démarrer l'application avec accès public (tunnel)
# Usage: ./start_with_public_access.sh [tunnel_type]
# tunnel_type peut être: cloudflare ou localtunnel

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

# Fonction pour nettoyer les processus à la sortie
cleanup() {
    echo ""
    echo "🛑 Arrêt des processus..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ ! -z "$BACKEND_TUNNEL_PID" ]; then
        kill $BACKEND_TUNNEL_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_TUNNEL_PID" ]; then
        kill $FRONTEND_TUNNEL_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Activer l'environnement virtuel pour le backend si présent
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

# Fonction pour démarrer un tunnel
start_tunnel() {
    local port=$1
    local name=$2
    local api_port=$3  # Port de l'API (non utilisé actuellement)
    
    case $TUNNEL_TYPE in
        cloudflare)
            if ! command -v cloudflared &> /dev/null; then
                echo "❌ cloudflared n'est pas installé. Installez-le avec: brew install cloudflare/cloudflare/cloudflared"
                return 1
            fi
            cloudflared tunnel --url http://localhost:$port > ../${name}_tunnel.log 2>&1 &
            echo $!
            ;;
        localtunnel)
            if ! command -v lt &> /dev/null; then
                echo "❌ localtunnel n'est pas installé. Installez-le avec: npm install -g localtunnel"
                return 1
            fi
            lt --port $port > ../${name}_tunnel.log 2>&1 &
            echo $!
            ;;
        *)
            echo "❌ Type de tunnel inconnu: $TUNNEL_TYPE"
            return 1
            ;;
    esac
}

# Démarrer les tunnels
echo "🌍 Démarrage du tunnel backend..."
BACKEND_TUNNEL_PID=$(start_tunnel $BACKEND_PORT "backend" "4040")
if [ -z "$BACKEND_TUNNEL_PID" ]; then
    cleanup
    exit 1
fi

echo "🌍 Démarrage du tunnel frontend..."
FRONTEND_TUNNEL_PID=$(start_tunnel $FRONTEND_PORT "frontend" "4041")
if [ -z "$FRONTEND_TUNNEL_PID" ]; then
    cleanup
    exit 1
fi

# Attendre que les tunnels démarrent
echo ""
echo "⏳ Attente du démarrage des tunnels (10 secondes)..."
sleep 10

# Extraire les URLs des tunnels
echo ""
echo "🔍 Récupération des URLs des tunnels..."

if [ "$TUNNEL_TYPE" = "cloudflare" ]; then
    # Pour cloudflare, les URLs sont dans les logs
    BACKEND_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' backend_tunnel.log 2>/dev/null | head -1)
    FRONTEND_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' frontend_tunnel.log 2>/dev/null | head -1)
elif [ "$TUNNEL_TYPE" = "localtunnel" ]; then
    # Pour localtunnel, les URLs sont dans les logs
    BACKEND_URL=$(grep -o 'https://[^ ]*\.loca\.lt' backend_tunnel.log 2>/dev/null | head -1)
    FRONTEND_URL=$(grep -o 'https://[^ ]*\.loca\.lt' frontend_tunnel.log 2>/dev/null | head -1)
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Application démarrée avec succès!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📱 URL Frontend (accessible depuis n'importe où):"
if [ ! -z "$FRONTEND_URL" ]; then
    echo "   $FRONTEND_URL"
else
    echo "   ⚠️  URL non détectée automatiquement"
    echo "   Vérifiez les logs: cat frontend_tunnel.log"
fi
echo ""
echo "🔧 URL Backend:"
if [ ! -z "$BACKEND_URL" ]; then
    echo "   $BACKEND_URL"
    echo ""
    echo "💡 Configurez votre frontend:"
    echo "   Créez un fichier frontend/.env.local avec:"
    echo "   NEXT_PUBLIC_API_URL=$BACKEND_URL"
else
    echo "   ⚠️  URL non détectée automatiquement"
    echo "   Vérifiez les logs: cat backend_tunnel.log"
fi
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 PIDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo "   Tunnel Backend: $BACKEND_TUNNEL_PID"
echo "   Tunnel Frontend: $FRONTEND_TUNNEL_PID"
echo ""
echo "🛑 Pour arrêter, appuyez sur Ctrl+C"
echo ""

# Attendre indéfiniment
wait

