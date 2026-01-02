-- Migration: Modifier la contrainte de clé étrangère job_history.job_id
-- pour permettre la conservation de l'historique même après suppression du job
-- ============================================

-- Étape 1: Supprimer l'ancienne contrainte de clé étrangère
ALTER TABLE job_history 
DROP CONSTRAINT IF EXISTS job_history_job_id_fkey;

-- Étape 2: Modifier la colonne job_id pour permettre NULL (optionnel, si on veut garder la référence)
-- OU garder NOT NULL mais changer le comportement en cascade
-- Ici, on garde NOT NULL mais on change le comportement en SET NULL pour conserver l'historique
-- En fait, pour conserver l'historique, on doit permettre NULL ou changer le comportement

-- Option 1: Permettre NULL pour conserver l'historique même si le job est supprimé
ALTER TABLE job_history 
ALTER COLUMN job_id DROP NOT NULL;

-- Étape 3: Recréer la contrainte avec ON DELETE SET NULL au lieu de CASCADE
ALTER TABLE job_history 
ADD CONSTRAINT job_history_job_id_fkey 
FOREIGN KEY (job_id) 
REFERENCES jobs(id) 
ON DELETE SET NULL;

-- Note: Cette migration permet de conserver l'historique même après suppression du job
-- Le job_id sera mis à NULL, mais l'historique sera conservé avec toutes les autres informations

