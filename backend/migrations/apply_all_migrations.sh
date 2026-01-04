#!/bin/bash
# Script pour appliquer toutes les migrations nécessaires

# Obtenir le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Application des migrations..."
echo "📁 Répertoire des migrations: $SCRIPT_DIR"

# Migration 1: Ajouter meeting_link à interviews
echo "📝 Migration 1: Ajout de meeting_link à la table interviews..."
psql -h localhost -U postgres -d recrutement_db -f "$SCRIPT_DIR/add_meeting_link_to_interviews.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migration 1 appliquée avec succès"
else
    echo "❌ Erreur lors de l'application de la migration 1"
    exit 1
fi

# Migration 2: Ajouter notes à interviews
echo "📝 Migration 2: Ajout de notes à la table interviews..."
psql -h localhost -U postgres -d recrutement_db -f "$SCRIPT_DIR/add_notes_to_interviews.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migration 2 appliquée avec succès"
else
    echo "❌ Erreur lors de l'application de la migration 2"
    exit 1
fi

# Migration 3: Ajouter decision et score à interviews
echo "📝 Migration 3: Ajout de decision et score à la table interviews..."
psql -h localhost -U postgres -d recrutement_db -f "$SCRIPT_DIR/add_decision_score_to_interviews.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migration 3 appliquée avec succès"
else
    echo "❌ Erreur lors de l'application de la migration 3"
    exit 1
fi

# Migration 4: Créer la table candidate_job_comparisons
echo "📝 Migration 4: Création de la table candidate_job_comparisons..."
psql -h localhost -U postgres -d recrutement_db -f "$SCRIPT_DIR/create_candidate_job_comparisons_table.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migration 4 appliquée avec succès"
else
    echo "❌ Erreur lors de l'application de la migration 4"
    exit 1
fi

echo "🎉 Toutes les migrations ont été appliquées avec succès !"

