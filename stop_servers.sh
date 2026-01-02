#!/bin/bash

# Script pour arrêter tous les serveurs (backend, frontend, tunnels)

echo "🛑 Arrêt de tous les serveurs..."

# Arrêter les processus sur le port 8000 (backend)
echo "🔧 Arrêt du backend (port 8000)..."
PIDS_8000=$(lsof -ti:8000 2>/dev/null)
if [ ! -z "$PIDS_8000" ]; then
    echo "$PIDS_8000" | xargs kill -9 2>/dev/null
    echo "✅ Backend arrêté"
else
    echo "ℹ️  Aucun processus sur le port 8000"
fi

# Arrêter les processus sur le port 3000 (frontend)
echo "🌐 Arrêt du frontend (port 3000)..."
PIDS_3000=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PIDS_3000" ]; then
    echo "$PIDS_3000" | xargs kill -9 2>/dev/null
    echo "✅ Frontend arrêté"
else
    echo "ℹ️  Aucun processus sur le port 3000"
fi

# Arrêter les processus cloudflared
echo "🌍 Arrêt des tunnels cloudflare..."
pkill -f cloudflared 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Tunnels cloudflare arrêtés"
else
    echo "ℹ️  Aucun tunnel cloudflare actif"
fi

# Arrêter les processus localtunnel
echo "🌍 Arrêt des tunnels localtunnel..."
pkill -f "lt --port" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Tunnels localtunnel arrêtés"
else
    echo "ℹ️  Aucun tunnel localtunnel actif"
fi

echo ""
echo "✅ Tous les serveurs ont été arrêtés"




