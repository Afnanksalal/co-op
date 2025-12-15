-- Migration: Add jurisdiction filtering columns to rag_files
-- This migration adds region, jurisdictions, and document_type columns
-- for granular geographic and regulatory filtering

-- Add region column (geographic region for jurisdiction filtering)
ALTER TABLE rag_files 
ADD COLUMN IF NOT EXISTS region VARCHAR(50) NOT NULL DEFAULT 'global';

-- Add jurisdictions column (comma-separated regulatory frameworks)
ALTER TABLE rag_files 
ADD COLUMN IF NOT EXISTS jurisdictions TEXT NOT NULL DEFAULT 'general';

-- Add document_type column (type of document content)
ALTER TABLE rag_files 
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) NOT NULL DEFAULT 'guide';

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_rag_files_region ON rag_files(region);
CREATE INDEX IF NOT EXISTS idx_rag_files_document_type ON rag_files(document_type);
CREATE INDEX IF NOT EXISTS idx_rag_files_domain_sector_region ON rag_files(domain, sector, region);

-- Update existing records to have default values (already handled by DEFAULT clause)
-- No data migration needed as defaults are applied
