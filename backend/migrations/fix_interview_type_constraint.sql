-- Script SQL pour corriger la contrainte CHECK sur interview_type
-- À exécuter dans psql ou via votre client PostgreSQL

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE interviews 
DROP CONSTRAINT IF EXISTS interviews_interview_type_check;

-- 2. Ajouter la nouvelle contrainte avec tous les types valides
ALTER TABLE interviews 
ADD CONSTRAINT interviews_interview_type_check 
CHECK (interview_type IN ('rh', 'technique', 'client', 'prequalification', 'qualification', 'autre'));

-- 3. Ajouter la colonne scheduled_end_at si elle n'existe pas
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP;

-- 4. Vérifier que la contrainte a été appliquée
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'interviews'::regclass 
AND conname = 'interviews_interview_type_check';

-- 5. Vérifier que la colonne scheduled_end_at existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'interviews' 
AND column_name = 'scheduled_end_at';

