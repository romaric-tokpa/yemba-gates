-- Migration pour ajouter les champs de statut aux entretiens
-- Date: 2026-01-03
-- Exécutez ce script dans votre base de données PostgreSQL

-- Ajouter la colonne status si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planifié';

-- Ajouter la colonne rescheduled_at si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP;

-- Ajouter la colonne rescheduling_reason si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rescheduling_reason TEXT;

-- Ajouter la colonne cancellation_reason si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Ajouter la colonne cancelled_at si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Ajouter la colonne completed_at si elle n'existe pas
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Mettre à jour les entretiens existants pour avoir le statut 'planifié' par défaut
UPDATE interviews SET status = 'planifié' WHERE status IS NULL;

-- Supprimer la contrainte si elle existe déjà (pour éviter les erreurs)
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;

-- Ajouter une contrainte CHECK pour valider les statuts
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check 
CHECK (status IN ('planifié', 'réalisé', 'reporté', 'annulé'));

