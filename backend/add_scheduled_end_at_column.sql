-- Script SQL pour ajouter la colonne scheduled_end_at à la table interviews
-- À exécuter si Alembic n'est pas configuré

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP WITH TIME ZONE;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'interviews' AND column_name = 'scheduled_end_at';

