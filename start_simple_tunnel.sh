#!/bin/bash

# Script simplifié pour démarrer avec un seul tunnel
# Ce script démarre le backend et le frontend, puis crée un seul tunnel pour le frontend
# Le frontend se connectera automatiquement au backend via le même tunnel

TUNNEL_TYPE=${1:-cloudflare}
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo "🚀 Démarrage de l'application avec accès public (méthode simplifiée)..."
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
    if [ ! -z "$TUNNEL_PID" ]; then
        kill $TUNNEL_PID 2>/dev/null
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

# Démarrer un seul tunnel pour le frontend
echo "🌍 Démarrage du tunnel pour le frontend..."
case $TUNNEL_TYPE in
    cloudflare)
        if ! command -v cloudflared &> /dev/null; then
            echo "❌ cloudflared n'est pas installé. Installez-le avec: brew install cloudflare/cloudflare/cloudflared"
            cleanup
            exit 1
        fi
        cloudflared tunnel --url http://localhost:$FRONTEND_PORT > tunnel.log 2>&1 &
        TUNNEL_PID=$!
        ;;
    localtunnel)
        if ! command -v lt &> /dev/null; then
            echo "❌ localtunnel n'est pas installé. Installez-le avec: npm install -g localtunnel"
            cleanup
            exit 1
        fi
        lt --port $FRONTEND_PORT > tunnel.log 2>&1 &
        TUNNEL_PID=$!
        ;;
    *)
        echo "❌ Type de tunnel inconnu: $TUNNEL_TYPE"
        cleanup
        exit 1
        ;;
esac

# Attendre que le tunnel démarre
echo ""
echo "⏳ Attente du démarrage du tunnel (10 secondes)..."
sleep 10

# Extraire l'URL du tunnel
echo ""
echo "🔍 Récupération de l'URL du tunnel..."

if [ "$TUNNEL_TYPE" = "cloudflare" ]; then
    FRONTEND_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' tunnel.log 2>/dev/null | head -1)
elif [ "$TUNNEL_TYPE" = "localtunnel" ]; then
    FRONTEND_URL=$(grep -o 'https://[^ ]*\.loca\.lt' tunnel.log 2>/dev/null | head -1)
fi

# Pour cette méthode simplifiée, le backend est accessible via le même tunnel
# mais sur un chemin différent ou via un proxy
# La solution la plus simple : utiliser la même URL pour le backend
BACKEND_URL="$FRONTEND_URL"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Application démarrée avec succès!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📱 URL Publique (accessible depuis n'importe où):"
if [ ! -z "$FRONTEND_URL" ]; then
    echo "   $FRONTEND_URL"
    echo ""
    echo "💡 Configuration:"
    echo "   Le backend est accessible via le même tunnel."
    echo "   Créez un fichier frontend/.env.local avec:"
    echo "   NEXT_PUBLIC_API_URL=$BACKEND_URL"
    echo ""
    echo "   OU utilisez sessionStorage dans la console du navigateur:"
    echo "   sessionStorage.setItem('TUNNEL_BACKEND_URL', '$BACKEND_URL')"
else
    echo "   ⚠️  URL non détectée automatiquement"
    echo "   Vérifiez les logs: cat tunnel.log"
fi
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 PIDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo "   Tunnel: $TUNNEL_PID"
echo ""
echo "🛑 Pour arrêter, appuyez sur Ctrl+C"
echo ""

# Attendre indéfiniment
wait

