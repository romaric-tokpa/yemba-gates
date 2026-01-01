-- Migration pour mettre à jour la contrainte CHECK sur interview_type
-- Ajoute les types 'prequalification', 'qualification', et 'autre'

-- Supprimer l'ancienne contrainte
ALTER TABLE interviews 
DROP CONSTRAINT IF EXISTS interviews_interview_type_check;

-- Ajouter la nouvelle contrainte avec tous les types valides
ALTER TABLE interviews 
ADD CONSTRAINT interviews_interview_type_check 
CHECK (interview_type IN ('rh', 'technique', 'client', 'prequalification', 'qualification', 'autre'));

-- Vérifier que la contrainte a été appliquée
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'interviews'::regclass 
AND conname = 'interviews_interview_type_check';

