-- Migration pour ajouter la colonne updated_at à la table notifications
-- Date: 2026-01-02
-- Description: Ajoute la colonne updated_at manquante pour correspondre au modèle SQLModel

-- Ajouter la colonne updated_at si elle n'existe pas déjà
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Mettre à jour les valeurs existantes avec la valeur de created_at
UPDATE notifications 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

-- Créer le trigger
CREATE TRIGGER update_notifications_updated_at 
BEFORE UPDATE ON notifications
FOR EACH ROW 
EXECUTE FUNCTION update_notifications_updated_at();

