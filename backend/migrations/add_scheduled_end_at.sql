-- Migration pour ajouter la colonne scheduled_end_at à la table interviews
-- Cette colonne permet de définir l'heure de fin de l'entretien

-- Ajouter la colonne scheduled_end_at si elle n'existe pas
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'interviews' 
AND column_name = 'scheduled_end_at';

