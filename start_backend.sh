#!/bin/bash

# Script pour démarrer le serveur backend FastAPI
# Usage: ./start_backend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Vérifier que le répertoire backend existe
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Erreur: Le répertoire backend n'existe pas: $BACKEND_DIR"
    exit 1
fi

# Vérifier que main.py existe
if [ ! -f "$BACKEND_DIR/main.py" ]; then
    echo "❌ Erreur: Le fichier main.py n'existe pas dans: $BACKEND_DIR"
    exit 1
fi

# Se déplacer dans le répertoire backend
cd "$BACKEND_DIR" || exit 1

echo "🚀 Démarrage du serveur backend FastAPI..."
echo "📁 Répertoire: $(pwd)"
echo "🌐 URL: http://127.0.0.1:8000"
echo "📚 Documentation: http://127.0.0.1:8000/docs"
echo ""

# Activer l'environnement virtuel si présent (depuis la racine)
if [ -d "$SCRIPT_DIR/.venv" ]; then
    source "$SCRIPT_DIR/.venv/bin/activate"
    echo "✅ Environnement virtuel activé"
fi

# Démarrer uvicorn
uvicorn main:app --reload --host 127.0.0.1 --port 8000

