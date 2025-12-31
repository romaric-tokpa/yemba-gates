#!/bin/bash
# Script d'installation des dépendances avec support Python 3.14

echo "Installation des dépendances avec support Python 3.14..."

# Activer l'environnement virtuel si on est à la racine
if [ -f "../.venv/bin/activate" ]; then
    source ../.venv/bin/activate
fi

# Installer les dépendances avec la variable d'environnement pour Python 3.14
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
pip install -r requirements.txt

echo "Installation terminée !"






