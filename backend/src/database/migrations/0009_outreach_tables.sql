-- Customer Discovery & Outreach Tables
-- Migration: 0009_outreach_tables.sql
-- Supports both People (influencers) and Companies as lead types

-- Leads table - stores discovered potential customers/influencers
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  
  -- Lead type: 'person' (influencer) or 'company'
  lead_type VARCHAR(20) DEFAULT 'company',
  
  -- Company fields
  company_name VARCHAR(255),
  website VARCHAR(500),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  
  -- Person/Influencer fields
  name VARCHAR(255),
  platform VARCHAR(100), -- youtube, twitter, linkedin, instagram, tiktok
  handle VARCHAR(255), -- @username
  followers INTEGER,
  niche VARCHAR(255), -- tech, fitness, business, etc.
  
  -- Common fields
  email VARCHAR(255),
  location VARCHAR(255),
  description TEXT,
  profile_url VARCHAR(500),
  
  -- Custom fields (flexible key-value for any extra data)
  custom_fields JSONB DEFAULT '{}',
  
  -- Metadata
  lead_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100),
  tags JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);
CREATE INDEX IF NOT EXISTS leads_startup_id_idx ON leads(startup_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_type_idx ON leads(lead_type);

-- Campaigns table - stores email campaign configurations
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  
  -- Campaign mode: 'single_template' or 'ai_personalized'
  mode VARCHAR(50) DEFAULT 'single_template',
  
  -- For single_template mode - one template for all
  subject_template TEXT,
  body_template TEXT,
  
  -- For ai_personalized mode - AI generates unique emails
  campaign_goal TEXT,
  tone VARCHAR(50) DEFAULT 'professional',
  call_to_action TEXT,
  
  -- Target lead type
  target_lead_type VARCHAR(20) DEFAULT 'person',
  
  status VARCHAR(50) DEFAULT 'draft',
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Available variables for templates
  available_variables JSONB DEFAULT '[]',
  
  -- Stats (denormalized for quick access)
  stats JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);

-- Campaign emails table - individual emails in a campaign
CREATE TABLE IF NOT EXISTS campaign_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Tracking
  tracking_id VARCHAR(100) UNIQUE,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  
  -- Error info
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_emails_campaign_id_idx ON campaign_emails(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_emails_lead_id_idx ON campaign_emails(lead_id);
CREATE INDEX IF NOT EXISTS campaign_emails_status_idx ON campaign_emails(status);
CREATE INDEX IF NOT EXISTS campaign_emails_tracking_id_idx ON campaign_emails(tracking_id);
