-- Migration pour ajouter les colonnes decision et score à la table interviews
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS decision VARCHAR(20) NULL;

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS score INTEGER NULL;

COMMENT ON COLUMN interviews.decision IS 'Décision de l''entretien : positif, négatif, en_attente';
COMMENT ON COLUMN interviews.score IS 'Score sur 10 de l''entretien';
