-- Script pour vider toutes les tables (garder la structure)
-- Ce script vide toutes les données mais conserve la structure des tables
-- 
-- Utilisation :
--   psql -U postgres -d recrutement_db -f truncate_all_tables.sql

-- Vider toutes les tables en respectant les dépendances avec CASCADE
-- RESTART IDENTITY réinitialise les séquences auto-incrémentées
TRUNCATE TABLE 
    candidate_job_comparisons,
    client_interview_requests,
    team_members,
    teams,
    onboarding_checklists,
    offers,
    application_history,
    job_history,
    interviews,
    notifications,
    applications,
    candidates,
    job_recruiters,
    jobs,
    security_logs,
    settings,
    users
RESTART IDENTITY CASCADE;

-- Afficher un message de confirmation
SELECT 'Toutes les tables ont été vidées avec succès. La structure des tables est conservée.' AS message;
