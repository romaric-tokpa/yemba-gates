-- Migration pour augmenter la taille du champ phone dans la table candidates
-- Le champ phone était limité à VARCHAR(30) mais certains numéros peuvent être plus longs
-- (ex: numéros avec indicatifs multiples: '+225 0160 6369 11 / +225 0789 8279 60')

-- Augmenter la taille de la colonne phone de VARCHAR(30) à VARCHAR(100)
ALTER TABLE candidates 
ALTER COLUMN phone TYPE VARCHAR(100);

-- Vérification (optionnel)
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'candidates' AND column_name = 'phone';

