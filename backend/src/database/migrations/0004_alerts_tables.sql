-- Migration: Add alerts tables for competitor monitoring
-- Created: 2025-12-16

-- Create alert type enum
DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('competitor', 'market', 'news', 'funding');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create alert frequency enum
DO $$ BEGIN
    CREATE TYPE alert_frequency AS ENUM ('realtime', 'daily', 'weekly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    type alert_type NOT NULL DEFAULT 'competitor',
    
    keywords TEXT[] NOT NULL DEFAULT '{}',
    competitors TEXT[] NOT NULL DEFAULT '{}',
    
    frequency alert_frequency NOT NULL DEFAULT 'daily',
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    email_notify BOOLEAN NOT NULL DEFAULT true,
    webhook_notify BOOLEAN NOT NULL DEFAULT false,
    
    last_checked_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,
    trigger_count TEXT NOT NULL DEFAULT '0',
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create alert_results table
CREATE TABLE IF NOT EXISTS alert_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source TEXT,
    source_url TEXT,
    relevance_score TEXT,
    
    matched_keywords TEXT[] DEFAULT '{}',
    matched_competitor TEXT,
    
    is_read BOOLEAN NOT NULL DEFAULT false,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_startup_id ON alerts(startup_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_results_alert_id ON alert_results(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_results_is_read ON alert_results(is_read);
CREATE INDEX IF NOT EXISTS idx_alert_results_created_at ON alert_results(created_at DESC);
