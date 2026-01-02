-- Migration pour mettre à jour la contrainte CHECK du champ status dans la table jobs
-- Date: 2026-01-02
-- Description: Ajoute tous les nouveaux statuts (a_valider, urgent, tres_urgent, besoin_courant, gagne, standby, archive)

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Augmenter la taille du champ status si nécessaire
ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);

-- Ajouter la nouvelle contrainte avec tous les statuts
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
CHECK (status IN (
    'brouillon',
    'a_valider',
    'urgent',
    'tres_urgent',
    'besoin_courant',
    'validé',
    'en_cours',
    'gagne',
    'standby',
    'archive',
    'clôturé',
    'en_attente',
    'en_attente_validation'
));

