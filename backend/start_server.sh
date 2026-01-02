#!/bin/bash

# Script pour démarrer le serveur backend accessible depuis le réseau local
# Usage: ./start_server.sh

echo "🚀 Démarrage du serveur backend sur http://0.0.0.0:8000"
echo "📱 Accessible depuis le réseau local sur http://$(hostname -I | awk '{print $1}'):8000"
echo ""

# Activer l'environnement virtuel si présent
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Démarrer le serveur avec uvicorn
# --host 0.0.0.0 permet d'écouter sur toutes les interfaces réseau
# --reload active le rechargement automatique en développement
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

