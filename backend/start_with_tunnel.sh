#!/bin/bash

# Script pour démarrer le backend avec support pour tunnels (cloudflare, localtunnel)
# Usage: ./start_with_tunnel.sh [tunnel_type]
# tunnel_type peut être: cloudflare ou localtunnel

TUNNEL_TYPE=${1:-cloudflare}
BACKEND_PORT=8000

echo "🚀 Démarrage du serveur backend avec support tunnel..."
echo "📡 Type de tunnel: $TUNNEL_TYPE"
echo ""

# Activer l'environnement virtuel si présent
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Démarrer le backend en arrière-plan
echo "🔧 Démarrage du backend sur le port $BACKEND_PORT..."
python -m uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 3

# Démarrer le tunnel selon le type
case $TUNNEL_TYPE in
    cloudflare)
        echo "🌐 Démarrage de Cloudflare Tunnel..."
        if ! command -v cloudflared &> /dev/null; then
            echo "❌ cloudflared n'est pas installé. Installez-le avec: brew install cloudflare/cloudflare/cloudflared"
            kill $BACKEND_PID
            exit 1
        fi
        cloudflared tunnel --url http://localhost:$BACKEND_PORT &
        TUNNEL_PID=$!
        echo "✅ Cloudflare Tunnel démarré. URL publique disponible dans quelques secondes..."
        ;;
    localtunnel)
        echo "🌐 Démarrage de localtunnel..."
        if ! command -v lt &> /dev/null; then
            echo "❌ localtunnel n'est pas installé. Installez-le avec: npm install -g localtunnel"
            kill $BACKEND_PID
            exit 1
        fi
        lt --port $BACKEND_PORT &
        TUNNEL_PID=$!
        echo "✅ localtunnel démarré. URL publique disponible dans quelques secondes..."
        ;;
    *)
        echo "❌ Type de tunnel inconnu: $TUNNEL_TYPE"
        echo "Types supportés: cloudflare, localtunnel"
        kill $BACKEND_PID
        exit 1
        ;;
esac

echo ""
echo "✅ Backend et tunnel démarrés!"
echo "📝 PID Backend: $BACKEND_PID"
echo "📝 PID Tunnel: $TUNNEL_PID"
echo ""
echo "Pour arrêter, appuyez sur Ctrl+C ou exécutez: kill $BACKEND_PID $TUNNEL_PID"

# Attendre la fin
wait

