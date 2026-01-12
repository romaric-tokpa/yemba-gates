#!/bin/bash
# Script pour créer le fichier .env avec la configuration SMTP

cat > .env << 'EOF'
# Configuration de la base de données PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recrutement_db

# Configuration du serveur (optionnel)
HOST=0.0.0.0
PORT=8000

# Clé API pour Google Gemini
GEMINI_API_KEY=AIzaSyBiKaxjMiAoirUYeC5dZBc5MknA1ogEh4Q
# (Ancienne variable pour compatibilité, utilisez GEMINI_API_KEY)
OPENAI_API_KEY=AIzaSyBiKaxjMiAoirUYeC5dZBc5MknA1ogEh4Q

# URL de connexion pour les emails d'invitation (optionnel)
LOGIN_URL=http://localhost:3000/auth/login

# Adresse email de l'expéditeur (optionnel, valeur par défaut: no_reply@yemma-gates.com)
FROM_EMAIL=no_reply@yemma-gates.com

# Configuration SMTP pour l'envoi d'emails (yemma-gates.com via SecureMail)
# Si ces variables ne sont pas configurées, les emails seront affichés dans la console (mode simulation)
SMTP_HOST=smtp.yemma-gates.com
SMTP_PORT=587
SMTP_USER=no_reply@yemma-gates.com
SMTP_PASSWORD=18-19Th022611
SMTP_USE_TLS=true
EOF

echo "✅ Fichier .env créé avec succès dans backend/"
