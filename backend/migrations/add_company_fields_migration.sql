-- =============================================================================
-- MIGRATION: Ajouter les colonnes country, industry, size à la table companies
-- =============================================================================
-- Date: 2025-01-14
-- Description: Ajoute les champs country, industry, size à la table companies
--              pour supporter les informations supplémentaires dans le formulaire
--              d'inscription d'entreprise
-- =============================================================================

-- Ajouter les colonnes si elles n'existent pas déjà
DO $$
BEGIN
    -- Ajouter country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE companies ADD COLUMN country VARCHAR(100);
        RAISE NOTICE 'Colonne country ajoutée';
    ELSE
        RAISE NOTICE 'Colonne country existe déjà';
    END IF;

    -- Ajouter industry
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'industry'
    ) THEN
        ALTER TABLE companies ADD COLUMN industry VARCHAR(100);
        RAISE NOTICE 'Colonne industry ajoutée';
    ELSE
        RAISE NOTICE 'Colonne industry existe déjà';
    END IF;

    -- Ajouter size
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'size'
    ) THEN
        ALTER TABLE companies ADD COLUMN size VARCHAR(50);
        RAISE NOTICE 'Colonne size ajoutée';
    ELSE
        RAISE NOTICE 'Colonne size existe déjà';
    END IF;
END $$;

-- Vérifier que les colonnes ont été ajoutées
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'companies'
AND column_name IN ('country', 'industry', 'size')
ORDER BY column_name;
