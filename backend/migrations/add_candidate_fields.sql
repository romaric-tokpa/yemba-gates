-- Migration pour ajouter profile_picture_url et skills à la table candidates
-- Exécutez ce script dans votre base de données PostgreSQL

-- Ajouter la colonne profile_picture_url si elle n'existe pas
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- Ajouter la colonne skills (tableau de texte) si elle n'existe pas
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- Commentaires pour documentation
COMMENT ON COLUMN candidates.profile_picture_url IS 'URL de la photo de profil du candidat';
COMMENT ON COLUMN candidates.skills IS 'Liste des compétences du candidat (tableau PostgreSQL)';

