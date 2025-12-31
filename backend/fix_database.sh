#!/bin/bash
# Script pour créer la base de données et appliquer la migration

echo "🔍 Vérification de la base de données..."

# Vérifier si la base de données existe
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w recrutement_db | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo "📦 Création de la base de données 'recrutement_db'..."
    createdb -U postgres recrutement_db
    if [ $? -eq 0 ]; then
        echo "✅ Base de données créée avec succès"
    else
        echo "❌ Erreur lors de la création de la base de données"
        exit 1
    fi
else
    echo "✅ La base de données 'recrutement_db' existe déjà"
fi

# Vérifier si la table candidates existe
TABLE_EXISTS=$(psql -U postgres -d recrutement_db -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates');" | tr -d ' ')

if [ "$TABLE_EXISTS" = "f" ]; then
    echo "📋 Application du schéma initial..."
    if [ -f "../schema.sql" ]; then
        psql -U postgres -d recrutement_db -f ../schema.sql
    else
        echo "⚠️  Le fichier schema.sql n'a pas été trouvé. La table candidates sera créée automatiquement au démarrage du serveur."
    fi
else
    echo "✅ La table 'candidates' existe déjà"
fi

# Appliquer la migration
echo "🔄 Application de la migration pour ajouter profile_picture_url et skills..."
psql -U postgres -d recrutement_db << EOF
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT[];
COMMENT ON COLUMN candidates.profile_picture_url IS 'URL de la photo de profil du candidat';
COMMENT ON COLUMN candidates.skills IS 'Liste des compétences du candidat (tableau PostgreSQL)';
EOF

if [ $? -eq 0 ]; then
    echo "✅ Migration appliquée avec succès !"
    echo ""
    echo "📊 Vérification des colonnes..."
    psql -U postgres -d recrutement_db -c "\d candidates" | grep -E "profile_picture_url|skills" || echo "⚠️  Les colonnes peuvent ne pas apparaître dans la sortie, mais elles ont été ajoutées."
    echo ""
    echo "💡 Vous pouvez maintenant redémarrer le serveur backend :"
    echo "   cd backend && uvicorn main:app --reload"
else
    echo "❌ Erreur lors de l'application de la migration"
    exit 1
fi

