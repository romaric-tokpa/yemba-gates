-- =============================================================================
-- MIGRATION: Ajout de company_id pour le support multi-tenant
-- =============================================================================
-- Cette migration ajoute la colonne company_id à toutes les tables nécessaires
-- et crée les index appropriés pour l'isolation des données
-- =============================================================================

-- IMPORTANT: Exécuter cette migration sur chaque base de données tenant
-- Pour la base par défaut, utiliser l'ID de l'entreprise par défaut créée dans MASTER_DB

-- =============================================================================
-- ÉTAPE 1: Ajouter company_id à la table users
-- =============================================================================

-- Ajouter la colonne company_id (nullable temporairement pour la migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID;

-- Créer un index sur company_id
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Créer un index unique composite pour email unique par tenant
-- (email peut être dupliqué entre différents tenants)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_company_unique ON users(email, company_id);

-- Supprimer l'ancien index unique sur email (si existe)
DROP INDEX IF EXISTS users_email_key;

-- =============================================================================
-- ÉTAPE 2: Ajouter company_id aux autres tables métier
-- =============================================================================

-- Jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);

-- Candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON candidates(company_id);

-- Applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);

-- Interviews
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON interviews(company_id);

-- Notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);

-- Offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_offers_company_id ON offers(company_id);

-- OnboardingChecklists
ALTER TABLE onboarding_checklists ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_id ON onboarding_checklists(company_id);

-- JobHistory
ALTER TABLE job_history ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_job_history_company_id ON job_history(company_id);

-- ApplicationHistory
ALTER TABLE application_history ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_application_history_company_id ON application_history(company_id);

-- SecurityLog
ALTER TABLE security_logs ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_security_logs_company_id ON security_logs(company_id);

-- Settings (optionnel - peut être partagé ou par tenant)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id);

-- Teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);

-- TeamMembers
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON team_members(company_id);

-- JobRecruiters
ALTER TABLE job_recruiters ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_job_recruiters_company_id ON job_recruiters(company_id);

-- ClientInterviewRequests
ALTER TABLE client_interview_requests ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_client_interview_requests_company_id ON client_interview_requests(company_id);

-- CandidateJobComparisons
ALTER TABLE candidate_job_comparisons ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_candidate_job_comparisons_company_id ON candidate_job_comparisons(company_id);

-- =============================================================================
-- ÉTAPE 3: Mettre à jour les données existantes
-- =============================================================================

-- IMPORTANT: Remplacer 'COMPANY_ID_DEFAULT' par l'ID réel de l'entreprise par défaut
-- Obtenir cet ID depuis la base MASTER:
-- SELECT id FROM companies WHERE subdomain = 'default';

-- Mettre à jour tous les enregistrements existants avec l'ID de l'entreprise par défaut
-- (À adapter selon votre ID d'entreprise par défaut)

-- Exemple (à décommenter et adapter):
-- UPDATE users SET company_id = 'COMPANY_ID_DEFAULT' WHERE company_id IS NULL;
-- UPDATE jobs SET company_id = (SELECT company_id FROM users WHERE users.id = jobs.created_by LIMIT 1) WHERE company_id IS NULL;
-- UPDATE candidates SET company_id = (SELECT company_id FROM users WHERE users.id = candidates.created_by LIMIT 1) WHERE company_id IS NULL;
-- UPDATE applications SET company_id = (SELECT company_id FROM jobs WHERE jobs.id = applications.job_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE interviews SET company_id = (SELECT company_id FROM applications WHERE applications.id = interviews.application_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE notifications SET company_id = (SELECT company_id FROM users WHERE users.id = notifications.user_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE offers SET company_id = (SELECT company_id FROM applications WHERE applications.id = offers.application_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE onboarding_checklists SET company_id = (SELECT company_id FROM applications WHERE applications.id = onboarding_checklists.application_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE job_history SET company_id = (SELECT company_id FROM jobs WHERE jobs.id = job_history.job_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE application_history SET company_id = (SELECT company_id FROM applications WHERE applications.id = application_history.application_id LIMIT 1) WHERE company_id IS NULL;
-- UPDATE security_logs SET company_id = (SELECT company_id FROM users WHERE users.id = security_logs.user_id LIMIT 1) WHERE company_id IS NULL;

-- =============================================================================
-- ÉTAPE 4: Rendre company_id obligatoire (après migration des données)
-- =============================================================================

-- IMPORTANT: Ne décommenter que APRÈS avoir mis à jour toutes les données existantes

-- ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE jobs ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE candidates ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE applications ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE interviews ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE notifications ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE offers ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE onboarding_checklists ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE job_history ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE application_history ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE security_logs ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE teams ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE team_members ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE job_recruiters ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE client_interview_requests ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE candidate_job_comparisons ALTER COLUMN company_id SET NOT NULL;

-- =============================================================================
-- ÉTAPE 5: Ajouter les contraintes de clé étrangère (optionnel)
-- =============================================================================

-- Si vous voulez ajouter des contraintes de clé étrangère vers la table companies
-- dans la base MASTER, vous devrez utiliser des Foreign Keys avec des schémas
-- ou des bases de données différentes. Pour l'instant, on s'appuie sur l'application
-- pour maintenir l'intégrité référentielle.

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

-- Vérifier que toutes les colonnes ont été ajoutées
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'company_id'
ORDER BY table_name;

-- Vérifier les index créés
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE '%company_id%'
ORDER BY tablename, indexname;
