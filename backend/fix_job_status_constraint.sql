-- Script SQL pour mettre à jour la contrainte CHECK du champ status dans la table jobs
-- Ce script ajoute le statut 'en_attente' à la liste des statuts autorisés

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Ajouter la nouvelle contrainte avec le statut 'en_attente'
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('brouillon', 'validé', 'en_cours', 'clôturé', 'en_attente', 'en_attente_validation'));

-- Optionnel : Augmenter la taille du champ status si nécessaire (déjà fait par la migration)
-- ALTER TABLE jobs ALTER COLUMN status TYPE VARCHAR(50);

