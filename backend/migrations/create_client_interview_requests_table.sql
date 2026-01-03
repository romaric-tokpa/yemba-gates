-- Migration pour créer la table client_interview_requests
-- Cette table stocke les demandes d'entretien client avec leurs disponibilités

CREATE TABLE IF NOT EXISTS client_interview_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    availability_slots TEXT NOT NULL,  -- JSON string avec les créneaux de disponibilité
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'scheduled', 'cancelled'
    scheduled_interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT client_interview_requests_status_check CHECK (status IN ('pending', 'scheduled', 'cancelled'))
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_interview_requests_application_id ON client_interview_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_client_interview_requests_client_id ON client_interview_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_interview_requests_status ON client_interview_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_interview_requests_scheduled_interview_id ON client_interview_requests(scheduled_interview_id);

-- Commentaires
COMMENT ON TABLE client_interview_requests IS 'Demandes d''entretien client avec disponibilités';
COMMENT ON COLUMN client_interview_requests.availability_slots IS 'JSON string contenant les créneaux de disponibilité du client';
COMMENT ON COLUMN client_interview_requests.status IS 'Statut de la demande: pending (en attente), scheduled (programmée), cancelled (annulée)';

