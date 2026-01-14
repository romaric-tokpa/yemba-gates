-- =============================================================================
-- OPTIMISATION DES INDEX POUR LES KPI
-- =============================================================================
-- Création d'index pour améliorer les performances des requêtes KPI
-- À exécuter sur chaque base de données tenant
-- =============================================================================

-- =============================================================================
-- INDEX POUR LES APPLICATIONS
-- =============================================================================

-- Index composite pour les requêtes de statut avec date
CREATE INDEX IF NOT EXISTS idx_applications_status_created_at 
ON applications(status, created_at);

-- Index pour les requêtes par job_id et statut
CREATE INDEX IF NOT EXISTS idx_applications_job_id_status 
ON applications(job_id, status);

-- Index pour les requêtes par candidat et statut
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id_status 
ON applications(candidate_id, status);

-- Index pour les requêtes avec offer_sent_at
CREATE INDEX IF NOT EXISTS idx_applications_offer_sent_at 
ON applications(offer_sent_at) WHERE offer_sent_at IS NOT NULL;

-- Index pour les requêtes avec is_in_shortlist
CREATE INDEX IF NOT EXISTS idx_applications_is_in_shortlist 
ON applications(is_in_shortlist) WHERE is_in_shortlist = TRUE;

-- Index composite pour company_id et statut (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_applications_company_id_status 
ON applications(company_id, status);

-- =============================================================================
-- INDEX POUR LES JOBS
-- =============================================================================

-- Index composite pour les requêtes de statut avec date
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at 
ON jobs(status, created_at);

-- Index pour les requêtes avec validated_at
CREATE INDEX IF NOT EXISTS idx_jobs_validated_at 
ON jobs(validated_at) WHERE validated_at IS NOT NULL;

-- Index pour les requêtes avec closed_at
CREATE INDEX IF NOT EXISTS idx_jobs_closed_at 
ON jobs(closed_at) WHERE closed_at IS NOT NULL;

-- Index composite pour created_by et statut
CREATE INDEX IF NOT EXISTS idx_jobs_created_by_status 
ON jobs(created_by, status);

-- Index composite pour company_id et statut (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_jobs_company_id_status 
ON jobs(company_id, status);

-- =============================================================================
-- INDEX POUR LES CANDIDATS
-- =============================================================================

-- Index composite pour created_by et statut
CREATE INDEX IF NOT EXISTS idx_candidates_created_by_status 
ON candidates(created_by, status);

-- Index pour les requêtes par source
CREATE INDEX IF NOT EXISTS idx_candidates_source 
ON candidates(source) WHERE source IS NOT NULL;

-- Index composite pour source et statut
CREATE INDEX IF NOT EXISTS idx_candidates_source_status 
ON candidates(source, status);

-- Index composite pour company_id et statut (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_candidates_company_id_status 
ON candidates(company_id, status);

-- Index composite pour company_id, created_by et statut
CREATE INDEX IF NOT EXISTS idx_candidates_company_created_status 
ON candidates(company_id, created_by, status);

-- =============================================================================
-- INDEX POUR LES ENTRETIENS
-- =============================================================================

-- Index pour les requêtes par scheduled_at
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at 
ON interviews(scheduled_at);

-- Index pour les requêtes avec feedback_provided_at
CREATE INDEX IF NOT EXISTS idx_interviews_feedback_provided_at 
ON interviews(feedback_provided_at) WHERE feedback_provided_at IS NOT NULL;

-- Index composite pour interviewer_id et scheduled_at
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_scheduled 
ON interviews(interviewer_id, scheduled_at) WHERE interviewer_id IS NOT NULL;

-- Index composite pour created_by et scheduled_at
CREATE INDEX IF NOT EXISTS idx_interviews_created_by_scheduled 
ON interviews(created_by, scheduled_at);

-- Index composite pour company_id et scheduled_at (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_interviews_company_scheduled 
ON interviews(company_id, scheduled_at);

-- Index pour les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_interviews_status 
ON interviews(status);

-- =============================================================================
-- INDEX POUR L'HISTORIQUE DES APPLICATIONS
-- =============================================================================

-- Index composite pour application_id et created_at (pour calculer les durées)
CREATE INDEX IF NOT EXISTS idx_application_history_app_created 
ON application_history(application_id, created_at);

-- Index pour les requêtes par changed_by
CREATE INDEX IF NOT EXISTS idx_application_history_changed_by 
ON application_history(changed_by);

-- Index composite pour company_id et created_at (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_application_history_company_created 
ON application_history(company_id, created_at);

-- =============================================================================
-- INDEX POUR L'HISTORIQUE DES JOBS
-- =============================================================================

-- Index composite pour job_id et created_at
CREATE INDEX IF NOT EXISTS idx_job_history_job_created 
ON job_history(job_id, created_at);

-- Index pour les requêtes par modified_by
CREATE INDEX IF NOT EXISTS idx_job_history_modified_by 
ON job_history(modified_by);

-- Index composite pour company_id et created_at (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_job_history_company_created 
ON job_history(company_id, created_at);

-- =============================================================================
-- INDEX POUR LES OFFRES
-- =============================================================================

-- Index pour les requêtes par sent_at
CREATE INDEX IF NOT EXISTS idx_offers_sent_at 
ON offers(sent_at) WHERE sent_at IS NOT NULL;

-- Index pour les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_offers_status 
ON offers(status);

-- Index composite pour company_id et status (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_offers_company_status 
ON offers(company_id, status);

-- =============================================================================
-- INDEX POUR LES NOTIFICATIONS
-- =============================================================================

-- Index composite pour user_id et is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);

-- Index pour les requêtes par created_at
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at);

-- Index composite pour company_id et created_at (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_notifications_company_created 
ON notifications(company_id, created_at);

-- =============================================================================
-- INDEX POUR LES JOB RECRUITERS
-- =============================================================================

-- Index composite pour job_id et recruiter_id
CREATE INDEX IF NOT EXISTS idx_job_recruiters_job_recruiter 
ON job_recruiters(job_id, recruiter_id);

-- Index pour les requêtes par recruiter_id
CREATE INDEX IF NOT EXISTS idx_job_recruiters_recruiter 
ON job_recruiters(recruiter_id);

-- Index composite pour company_id et recruiter_id (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_job_recruiters_company_recruiter 
ON job_recruiters(company_id, recruiter_id);

-- =============================================================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- =============================================================================

-- Vérifier tous les index créés
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        indexname LIKE '%status%' OR
        indexname LIKE '%created_at%' OR
        indexname LIKE '%company_id%' OR
        indexname LIKE '%scheduled_at%' OR
        indexname LIKE '%offer_sent_at%'
    )
ORDER BY tablename, indexname;

-- =============================================================================
-- ANALYSE DES TABLES (pour optimiser les requêtes)
-- =============================================================================

-- Analyser les tables pour mettre à jour les statistiques
ANALYZE applications;
ANALYZE jobs;
ANALYZE candidates;
ANALYZE interviews;
ANALYZE application_history;
ANALYZE job_history;
ANALYZE offers;
ANALYZE notifications;
ANALYZE job_recruiters;
