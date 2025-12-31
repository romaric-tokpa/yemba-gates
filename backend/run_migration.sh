#!/bin/bash
# Script pour exécuter la migration des colonnes candidates

echo "🔄 Exécution de la migration pour ajouter profile_picture_url et skills..."

# Vérifier si psql est disponible
if ! command -v psql &> /dev/null; then
    echo "❌ Erreur: psql n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Lire les variables d'environnement depuis .env si disponible
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Valeurs par défaut
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-recrutement_db}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "📊 Connexion à la base de données: $DB_NAME sur $DB_HOST:$DB_PORT"

# Exécuter la migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/add_candidate_fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration terminée avec succès !"
    echo "💡 Vous pouvez maintenant redémarrer le serveur backend."
else
    echo "❌ Erreur lors de la migration"
    echo "💡 Vérifiez que PostgreSQL est démarré et que la base de données existe."
    exit 1
fi

