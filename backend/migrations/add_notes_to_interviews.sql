-- Migration pour ajouter la colonne notes à la table interviews
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS notes TEXT NULL;
COMMENT ON COLUMN interviews.notes IS 'Notes préparatoires pour l''entretien';
