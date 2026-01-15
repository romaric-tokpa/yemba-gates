#!/bin/bash
# Script pour démarrer le serveur backend
# Usage: ./start_server.sh

cd "$(dirname "$0")"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
