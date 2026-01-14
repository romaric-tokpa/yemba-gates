-- =============================================================================
-- SCHÉMA BASE DE DONNÉES MASTER
-- =============================================================================
-- Base de données centrale pour la gestion multi-tenant
-- Contient les informations sur les entreprises et leurs bases de données dédiées
-- =============================================================================

-- Créer la base de données master si elle n'existe pas
-- CREATE DATABASE yemma_gates_master;

-- \c yemma_gates_master;

-- =============================================================================
-- TABLE: companies
-- =============================================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trial_ends_at TIMESTAMP,
    activated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(subdomain);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- =============================================================================
-- TABLE: tenant_databases
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_databases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    db_name VARCHAR(100) NOT NULL UNIQUE,
    db_host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    db_port INTEGER NOT NULL DEFAULT 5432,
    db_user VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'provisioning',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    provisioned_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_databases_company_id ON tenant_databases(company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_db_name ON tenant_databases(db_name);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_status ON tenant_databases(status);

-- =============================================================================
-- TABLE: plans
-- =============================================================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    plan_type VARCHAR(50) NOT NULL,
    max_users INTEGER,
    max_jobs INTEGER,
    max_candidates INTEGER,
    max_storage_gb INTEGER,
    features TEXT NOT NULL,  -- JSON string
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_plan_type ON plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- =============================================================================
-- TABLE: subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'trial',
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    trial_ends_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- =============================================================================
-- TABLE: billing_records
-- =============================================================================
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
    invoice_number VARCHAR(100) UNIQUE,
    billing_period_start TIMESTAMP NOT NULL,
    billing_period_end TIMESTAMP NOT NULL,
    paid_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_records_company_id ON billing_records(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_subscription_id ON billing_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_invoice_number ON billing_records(invoice_number);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);

-- =============================================================================
-- TABLE: platform_admins
-- =============================================================================
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON platform_admins(role);
CREATE INDEX IF NOT EXISTS idx_platform_admins_is_active ON platform_admins(is_active);

-- =============================================================================
-- DONNÉES INITIALES
-- =============================================================================

-- Insérer les plans par défaut
INSERT INTO plans (id, name, plan_type, max_users, max_jobs, max_candidates, max_storage_gb, features, price_monthly, price_yearly, is_active)
VALUES 
    (
        gen_random_uuid(),
        'Free',
        'free',
        5,
        10,
        50,
        1,
        '{"basic_dashboard": true, "basic_kpi": true, "email_support": false}',
        0,
        0,
        TRUE
    ),
    (
        gen_random_uuid(),
        'Basic',
        'basic',
        20,
        50,
        500,
        10,
        '{"basic_dashboard": true, "advanced_kpi": true, "email_support": true, "api_access": false}',
        50000,
        500000,
        TRUE
    ),
    (
        gen_random_uuid(),
        'Professional',
        'professional',
        100,
        200,
        5000,
        50,
        '{"basic_dashboard": true, "advanced_kpi": true, "ai_analysis": true, "email_support": true, "api_access": true, "custom_branding": false}',
        150000,
        1500000,
        TRUE
    ),
    (
        gen_random_uuid(),
        'Enterprise',
        'enterprise',
        NULL,  -- Illimité
        NULL,
        NULL,
        NULL,
        '{"basic_dashboard": true, "advanced_kpi": true, "ai_analysis": true, "email_support": true, "priority_support": true, "api_access": true, "custom_branding": true, "sso": true, "dedicated_support": true}',
        500000,
        5000000,
        TRUE
    )
ON CONFLICT (name) DO NOTHING;
