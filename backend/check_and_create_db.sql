-- Script pour vérifier et créer la base de données si elle n'existe pas
-- Exécutez ce script en tant que superutilisateur PostgreSQL

-- Se connecter à la base de données 'postgres' par défaut
\c postgres

-- Créer la base de données si elle n'existe pas
SELECT 'CREATE DATABASE recrutement_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'recrutement_db')\gexec

-- Se connecter à la nouvelle base de données
\c recrutement_db

-- Ajouter les colonnes manquantes
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS skills TEXT[];

-- Commentaires pour documentation
COMMENT ON COLUMN candidates.profile_picture_url IS 'URL de la photo de profil du candidat';
COMMENT ON COLUMN candidates.skills IS 'Liste des compétences du candidat (tableau PostgreSQL)';

-- Vérifier que les colonnes ont été ajoutées
\d candidates

