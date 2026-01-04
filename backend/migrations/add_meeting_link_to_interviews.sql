-- Migration: Ajouter la colonne meeting_link à la table interviews
-- Date: 2024

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500) NULL;

COMMENT ON COLUMN interviews.meeting_link IS 'Lien de visioconférence si l''entretien est virtuel';

