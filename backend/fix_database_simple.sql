-- Script SQL simple pour créer la base et appliquer la migration
-- Exécutez ce script en tant que superutilisateur PostgreSQL

-- Créer la base de données si elle n'existe pas (doit être exécuté depuis la base 'postgres')
\c postgres

-- Note: CREATE DATABASE ne peut pas être utilisé dans un bloc transactionnel
-- Exécutez d'abord: createdb -U postgres recrutement_db
-- Puis ce script pour ajouter les colonnes

\c recrutement_db

-- Ajouter les colonnes manquantes
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- Commentaires
COMMENT ON COLUMN candidates.profile_picture_url IS 'URL de la photo de profil du candidat';
COMMENT ON COLUMN candidates.skills IS 'Liste des compétences du candidat (tableau PostgreSQL)';

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
AND column_name IN ('profile_picture_url', 'skills');

