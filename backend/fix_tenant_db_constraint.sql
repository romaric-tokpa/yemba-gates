-- Script pour supprimer la contrainte UNIQUE sur db_name dans tenant_databases
-- Cette contrainte empêche plusieurs entreprises de partager la même base de données physique
-- L'isolation se fait par company_id dans les tables, pas par base de données séparée

-- Supprimer la contrainte UNIQUE si elle existe
ALTER TABLE tenant_databases 
DROP CONSTRAINT IF EXISTS tenant_databases_db_name_key;

-- Vérifier que la contrainte a été supprimée
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'tenant_databases'::regclass
AND conname LIKE '%db_name%';
