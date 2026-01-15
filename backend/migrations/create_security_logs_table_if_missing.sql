-- ============================================
-- Migration: Créer la table security_logs si elle n'existe pas
-- ============================================
-- Cette migration crée la table security_logs si elle n'existe pas déjà

CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    details TEXT,
    company_id UUID,  -- Pour l'isolation multi-tenant
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_company_id ON security_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_success ON security_logs(success);

-- Ajouter company_id si la table existe déjà mais sans cette colonne
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'security_logs'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'security_logs' 
        AND column_name = 'company_id'
    ) THEN
        -- Ajouter la colonne company_id
        ALTER TABLE security_logs 
        ADD COLUMN company_id UUID;
        
        -- Créer l'index si pas déjà créé
        CREATE INDEX IF NOT EXISTS idx_security_logs_company_id 
        ON security_logs(company_id);
        
        -- Mettre à jour les logs existants avec le company_id de l'utilisateur
        -- Vérifier d'abord si la colonne company_id existe dans users
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'company_id'
        ) THEN
            UPDATE security_logs 
            SET company_id = users.company_id
            FROM users
            WHERE security_logs.user_id = users.id
            AND security_logs.company_id IS NULL;
            
            RAISE NOTICE 'Logs existants mis à jour avec company_id depuis users';
        ELSE
            RAISE NOTICE 'La colonne company_id n''existe pas encore dans users, logs laissés à NULL';
        END IF;
        
        RAISE NOTICE 'Colonne company_id ajoutée à security_logs avec succès';
    END IF;
END $$;
