-- Migration: Add investors table
-- Created: 2025-12-16

-- Create investor stage enum
DO $$ BEGIN
    CREATE TYPE investor_stage AS ENUM ('pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create investors table
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    logo_url TEXT,
    
    -- Investment details
    stage investor_stage NOT NULL,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    check_size_min INTEGER,
    check_size_max INTEGER,
    
    -- Location
    location TEXT NOT NULL,
    regions TEXT[] NOT NULL DEFAULT '{}',
    
    -- Contact
    contact_email TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    
    -- Portfolio
    portfolio_companies TEXT[] DEFAULT '{}',
    notable_exits TEXT[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investors_stage ON investors(stage);
CREATE INDEX IF NOT EXISTS idx_investors_is_active ON investors(is_active);
CREATE INDEX IF NOT EXISTS idx_investors_is_featured ON investors(is_featured);
CREATE INDEX IF NOT EXISTS idx_investors_name ON investors(name);
CREATE INDEX IF NOT EXISTS idx_investors_sectors ON investors USING GIN(sectors);
CREATE INDEX IF NOT EXISTS idx_investors_regions ON investors USING GIN(regions);
