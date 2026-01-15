-- ============================================
-- Migration: Ajouter company_id à security_logs
-- ============================================
-- Cette migration ajoute la colonne company_id à la table security_logs
-- pour l'isolation multi-tenant

-- Vérifier si la colonne existe déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'security_logs' 
        AND column_name = 'company_id'
    ) THEN
        -- Ajouter la colonne company_id
        ALTER TABLE security_logs 
        ADD COLUMN company_id UUID;
        
        -- Créer un index sur company_id pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_security_logs_company_id 
        ON security_logs(company_id);
        
        -- Mettre à jour les logs existants si nécessaire
        -- Pour les logs existants, on peut les laisser à NULL ou les mettre à jour
        -- avec le company_id de l'utilisateur associé si user_id existe
        UPDATE security_logs 
        SET company_id = users.company_id
        FROM users
        WHERE security_logs.user_id = users.id
        AND security_logs.company_id IS NULL;
        
        RAISE NOTICE 'Colonne company_id ajoutée à security_logs avec succès';
    ELSE
        RAISE NOTICE 'La colonne company_id existe déjà dans security_logs';
    END IF;
END $$;
