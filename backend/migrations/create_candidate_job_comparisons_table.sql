-- Migration: Créer la table candidate_job_comparisons pour stocker les analyses IA
-- Date: 2024

CREATE TABLE IF NOT EXISTS candidate_job_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_data TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_candidate ON candidate_job_comparisons(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_job ON candidate_job_comparisons(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_created_by ON candidate_job_comparisons(created_by);

COMMENT ON TABLE candidate_job_comparisons IS 'Stocke les analyses IA de correspondance entre candidats et besoins de recrutement';

