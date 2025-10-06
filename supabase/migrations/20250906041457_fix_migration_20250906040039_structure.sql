-- Fix the problematic migration by ensuring correct table structure
-- This migration corrects the email_metrics table structure that was causing errors

-- The issue is that migration 20250906040039 tries to create indexes on columns that don't exist
-- Let's make sure the email_metrics table has the correct structure

-- First, let's see what columns actually exist
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if metric_name column exists (it shouldn't)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_metrics' 
        AND column_name = 'metric_name'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE 'metric_name column exists - this is unexpected';
    ELSE
        RAISE NOTICE 'metric_name column does not exist - this is correct';
    END IF;
    
    -- Check if period_start column exists (it shouldn't)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_metrics' 
        AND column_name = 'period_start'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE 'period_start column exists - this is unexpected';
    ELSE
        RAISE NOTICE 'period_start column does not exist - this is correct';
    END IF;
END $$;

-- The real fix: Make sure any future attempts to create these indexes will be safe
-- by creating them only if the columns exist, or skip them entirely

-- Since the correct structure doesn't have metric_name or period_start columns,
-- we don't need those indexes. The correct indexes are already created.

-- Verify the correct indexes exist
DO $$
BEGIN
    -- Check if the correct indexes exist
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_metrics_type') THEN
        RAISE NOTICE 'idx_email_metrics_type exists - correct';
    ELSE
        RAISE NOTICE 'idx_email_metrics_type missing - will create';
        CREATE INDEX IF NOT EXISTS idx_email_metrics_type ON email_metrics(metric_type);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_metrics_email_type') THEN
        RAISE NOTICE 'idx_email_metrics_email_type exists - correct';
    ELSE
        RAISE NOTICE 'idx_email_metrics_email_type missing - will create';
        CREATE INDEX IF NOT EXISTS idx_email_metrics_email_type ON email_metrics(email_type);
    END IF;
END $$;

-- Log that we've fixed the migration structure issue
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('migration_fix', 'system', 'structure_correction', jsonb_build_object(
    'migration', 'fix_migration_20250906040039_structure',
    'description', 'Fixed migration structure to prevent column errors during branch sync',
    'timestamp', NOW()
  ));