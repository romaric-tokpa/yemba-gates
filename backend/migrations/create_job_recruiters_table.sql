-- Migration pour créer la table job_recruiters
-- Cette table permet d'attribuer plusieurs recruteurs à un besoin

CREATE TABLE IF NOT EXISTS job_recruiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(job_id, recruiter_id)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_job_recruiters_job_id ON job_recruiters(job_id);
CREATE INDEX IF NOT EXISTS idx_job_recruiters_recruiter_id ON job_recruiters(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_job_recruiters_assigned_by ON job_recruiters(assigned_by);

-- Commentaires
COMMENT ON TABLE job_recruiters IS 'Table de liaison pour attribuer des recruteurs aux besoins de recrutement';
COMMENT ON COLUMN job_recruiters.job_id IS 'ID du besoin de recrutement';
COMMENT ON COLUMN job_recruiters.recruiter_id IS 'ID du recruteur attribué';
COMMENT ON COLUMN job_recruiters.assigned_at IS 'Date et heure de l''attribution';
COMMENT ON COLUMN job_recruiters.assigned_by IS 'ID du manager qui a effectué l''attribution';

