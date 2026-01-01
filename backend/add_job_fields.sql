-- Script SQL pour ajouter les nouvelles colonnes à la table jobs
-- À exécuter directement dans PostgreSQL si Alembic n'est pas configuré

-- Vérifier et ajouter les colonnes une par une (ignore si elles existent déjà)

-- INFORMATIONS GÉNÉRALES
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS manager_demandeur VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS entreprise VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS motif_recrutement VARCHAR(50);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS date_prise_poste DATE;

-- MISSIONS ET RESPONSABILITÉS
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS missions_principales TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS missions_secondaires TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS kpi_poste TEXT;

-- PROFIL RECHERCHÉ
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS niveau_formation VARCHAR(20);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_requise INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS competences_techniques_obligatoires TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS competences_techniques_souhaitees TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS competences_comportementales TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS langues_requises TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS certifications_requises TEXT;

-- CONTRAINTES ET CRITÈRES ÉLIMINATOIRES
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS localisation VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS mobilite_deplacements VARCHAR(20);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS teletravail VARCHAR(20);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contraintes_horaires TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS criteres_eliminatoires TEXT;

-- RÉMUNÉRATION ET CONDITIONS
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salaire_minimum FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salaire_maximum FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS avantages TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS evolution_poste TEXT;

