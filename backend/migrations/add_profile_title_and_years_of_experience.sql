-- Migration pour ajouter profile_title et years_of_experience à la table candidates
-- Exécutez ce script dans votre base de données PostgreSQL

-- Ajouter la colonne profile_title si elle n'existe pas
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_title VARCHAR(255);

-- Ajouter la colonne years_of_experience si elle n'existe pas
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;

-- Commentaires pour documentation
COMMENT ON COLUMN candidates.profile_title IS 'Titre du profil du candidat (ex: Développeur Fullstack)';
COMMENT ON COLUMN candidates.years_of_experience IS 'Nombre d''années d''expérience du candidat';

