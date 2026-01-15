-- ============================================
-- SCHÉMA DE BASE DE DONNÉES POSTGRESQL
-- Application de Suivi du Recrutement
-- ============================================

-- Extension pour les UUID (identifiants uniques)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (Utilisateurs)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('recruteur', 'manager', 'client', 'administrateur')),
    phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    company_id UUID,  -- Lien vers le tenant (entreprise) dans la base master
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: jobs (Besoins de recrutement)
-- ============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,                    -- Intitulé du poste
    department VARCHAR(100),                        -- Département / Client
    contract_type VARCHAR(50),                      -- Type de contrat (CDI, CDD, etc.)
    budget DECIMAL(10, 2),                          -- Budget
    urgency VARCHAR(20) CHECK (urgency IN ('faible', 'moyenne', 'haute', 'critique')),
    status VARCHAR(50) DEFAULT 'brouillon' CHECK (status IN (
        'brouillon', 'a_valider', 'urgent', 'tres_urgent', 'besoin_courant',
        'validé', 'en_cours', 'gagne', 'standby', 'archive', 'clôturé',
        'en_attente', 'en_attente_validation'
    )),
    job_description_file_path VARCHAR(500),        -- Chemin vers la fiche de poste
    created_by UUID NOT NULL REFERENCES users(id), -- Recruteur qui a créé le besoin
    validated_by UUID REFERENCES users(id),        -- Manager qui a validé
    validated_at TIMESTAMP,                         -- Date de validation
    closed_at TIMESTAMP,                            -- Date de clôture
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_validated_by ON jobs(validated_by);

-- ============================================
-- TABLE: candidates (Candidats)
-- ============================================
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    cv_file_path VARCHAR(500),                     -- Chemin vers le CV (PDF, Word)
    profile_picture_url VARCHAR(500),               -- URL de la photo de profil
    tags TEXT[],                                    -- Tags et mots-clés (tableau)
    skills TEXT[],                                  -- Compétences du candidat (tableau)
    source VARCHAR(50),                             -- Source (LinkedIn, cooptation, job board, etc.)
    status VARCHAR(50) DEFAULT 'sourcé' CHECK (status IN (
        'sourcé', 'qualifié', 'entretien_rh', 'entretien_client', 
        'shortlist', 'offre', 'rejeté', 'embauché'
    )),
    notes TEXT,                                     -- Notes internes
    created_by UUID NOT NULL REFERENCES users(id), -- Recruteur qui a sourcé le candidat
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_source ON candidates(source);
CREATE INDEX idx_candidates_created_by ON candidates(created_by);
CREATE INDEX idx_candidates_email ON candidates(email); -- Pour détecter les doublons

-- ============================================
-- TABLE: applications (Candidatures)
-- ============================================
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id), -- Recruteur qui a attribué le candidat au job
    status VARCHAR(50) DEFAULT 'sourcé' CHECK (status IN (
        'sourcé', 'qualifié', 'entretien_rh', 'entretien_client', 
        'shortlist', 'offre', 'rejeté', 'embauché'
    )),
    is_in_shortlist BOOLEAN DEFAULT FALSE,         -- Présent dans la shortlist
    client_feedback TEXT,                           -- Commentaires du client
    client_validated BOOLEAN,                       -- Validation client
    client_validated_at TIMESTAMP,
    offer_sent_at TIMESTAMP,                        -- Date d'envoi de l'offre
    offer_accepted BOOLEAN,                         -- Offre acceptée/refusée
    offer_accepted_at TIMESTAMP,
    onboarding_completed BOOLEAN DEFAULT FALSE,     -- Onboarding terminé
    onboarding_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, job_id)                    -- Un candidat ne peut postuler qu'une fois à un job
);

-- Index pour améliorer les performances
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_created_by ON applications(created_by);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_shortlist ON applications(is_in_shortlist);

-- ============================================
-- TABLE: interviews (Entretiens)
-- ============================================
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    interview_type VARCHAR(50) NOT NULL CHECK (interview_type IN ('rh', 'technique', 'client', 'prequalification', 'qualification', 'autre')),
    scheduled_at TIMESTAMP NOT NULL,                -- Date et heure planifiées
    scheduled_end_at TIMESTAMP,                      -- Date et heure de fin planifiées
    location VARCHAR(255),                          -- Lieu ou lien visioconférence
    interviewer_id UUID REFERENCES users(id),      -- Personne qui mène l'entretien
    preparation_notes TEXT,                         -- Notes de préparation
    feedback TEXT,                                  -- Feedback post-entretien (obligatoire)
    feedback_provided_at TIMESTAMP,                 -- Date du feedback
    decision VARCHAR(20) CHECK (decision IN ('positif', 'négatif', 'en_attente')),
    score INTEGER CHECK (score >= 0 AND score <= 10), -- Score sur 10
    created_by UUID NOT NULL REFERENCES users(id), -- Recruteur qui a planifié
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_interviews_application_id ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX idx_interviews_type ON interviews(interview_type);

-- ============================================
-- TABLE: job_history (Historique des modifications de jobs)
-- ============================================
CREATE TABLE job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,  -- Permet NULL pour conserver l'historique après suppression
    modified_by UUID NOT NULL REFERENCES users(id),
    field_name VARCHAR(100),                        -- Champ modifié
    old_value TEXT,                                 -- Ancienne valeur
    new_value TEXT,                                 -- Nouvelle valeur
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_history_job_id ON job_history(job_id);

-- ============================================
-- TABLE: application_history (Historique des candidatures)
-- ============================================
CREATE TABLE application_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_history_application_id ON application_history(application_id);

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),  -- Destinataire
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),  -- 'offer_accepted', 'job_pending_validation', 'feedback_received', etc.
    is_read BOOLEAN DEFAULT FALSE,
    related_job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    related_application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_related_job_id ON notifications(related_job_id);
CREATE INDEX idx_notifications_related_application_id ON notifications(related_application_id);

-- ============================================
-- TRIGGERS: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTAIRES SUR LES TABLES
-- ============================================
COMMENT ON TABLE users IS 'Table des utilisateurs de l''application (recruteurs, managers, clients, administrateurs)';
COMMENT ON TABLE jobs IS 'Table des besoins de recrutement (postes à pourvoir)';
COMMENT ON TABLE candidates IS 'Table des candidats (personnes candidates)';
COMMENT ON TABLE applications IS 'Table de liaison entre candidats et jobs (candidatures)';
COMMENT ON TABLE interviews IS 'Table des entretiens planifiés et réalisés';
COMMENT ON TABLE job_history IS 'Historique des modifications sur les jobs';
COMMENT ON TABLE application_history IS 'Historique des changements de statut des candidatures';

