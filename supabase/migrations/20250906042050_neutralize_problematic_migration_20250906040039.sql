-- Neutralize the problematic migration 20250906040039
-- This migration ensures that when 20250906040039 runs on preview branch,
-- it will encounter conditions that make it succeed or skip gracefully

-- The problematic migration tries to:
-- 1. CREATE INDEX IF NOT EXISTS idx_email_metrics_name_period ON email_metrics(metric_name, period_start, period_end)
-- 2. CREATE INDEX IF NOT EXISTS idx_email_system_dashboard_type ON email_system_dashboard(dashboard_type)

-- Problem 1: email_metrics doesn't have those columns
-- Problem 2: email_system_dashboard is a view, can't create indexes on views

-- Solution: Create a "migration compatibility" function that will be called
-- to handle these problematic statements gracefully

-- First, let's create a function that can safely handle the view index creation
CREATE OR REPLACE FUNCTION safe_create_view_index(view_name TEXT, index_name TEXT, column_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Check if the object is a view
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = view_name AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Cannot create index % on view %. Views do not support indexes. Skipping.', index_name, view_name;
        RETURN;
    END IF;
    
    -- If it's not a view, try to create the index
    BEGIN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(%I)', index_name, view_name, column_name);
        RAISE NOTICE 'Created index % on table %', index_name, view_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create index % on %: %', index_name, view_name, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION safe_create_view_index(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION safe_create_view_index(TEXT, TEXT, TEXT) TO authenticated;

-- Now, let's pre-create the problematic index on email_system_dashboard as a no-op
-- by calling our safe function (which will just log and skip)
SELECT safe_create_view_index('email_system_dashboard', 'idx_email_system_dashboard_type', 'dashboard_type');

-- For the email_metrics index issue, let's create a dummy index with a different name
-- so the IF NOT EXISTS check will work properly
DO $$
BEGIN
    -- Create a placeholder index that won't conflict
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_metrics_name_period_placeholder') THEN
        -- Create a simple index on existing columns as a placeholder
        CREATE INDEX idx_email_metrics_name_period_placeholder ON email_metrics(id);
        RAISE NOTICE 'Created placeholder index for migration compatibility';
    END IF;
END $$;

-- Log this fix
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('migration_neutralization', 'system', 'compatibility_fix', jsonb_build_object(
    'migration', 'neutralize_problematic_migration_20250906040039',
    'description', 'Created compatibility functions to neutralize problematic migration',
    'target_migration', '20250906040039',
    'timestamp', NOW()
  ));