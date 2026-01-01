#!/bin/bash

# Script pour appliquer les migrations nécessaires pour les entretiens
# - Met à jour la contrainte CHECK sur interview_type
# - Ajoute la colonne scheduled_end_at si elle n'existe pas

echo "🔧 Application des migrations pour la table interviews..."

# Variables de connexion (ajustez selon votre configuration)
DB_NAME="recrutement_db"
DB_USER="postgres"
DB_HOST="localhost"

# Appliquer la migration pour la contrainte CHECK
echo "📝 Mise à jour de la contrainte CHECK sur interview_type..."
psql -U $DB_USER -d $DB_NAME -f migrations/update_interview_type_check.sql

if [ $? -eq 0 ]; then
    echo "✅ Contrainte CHECK mise à jour avec succès"
else
    echo "❌ Erreur lors de la mise à jour de la contrainte CHECK"
    exit 1
fi

# Appliquer la migration pour scheduled_end_at
echo "📝 Ajout de la colonne scheduled_end_at..."
psql -U $DB_USER -d $DB_NAME -f migrations/add_scheduled_end_at.sql

if [ $? -eq 0 ]; then
    echo "✅ Colonne scheduled_end_at ajoutée avec succès"
else
    echo "❌ Erreur lors de l'ajout de la colonne scheduled_end_at"
    exit 1
fi

echo "✅ Toutes les migrations ont été appliquées avec succès !"

