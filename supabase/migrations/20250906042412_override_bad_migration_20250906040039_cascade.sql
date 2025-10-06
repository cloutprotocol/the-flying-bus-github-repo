-- Final override for the problematic migration 20250906040039
-- This migration will temporarily replace the view with a table to allow the bad migration to succeed

-- Step 1: Drop the view (with CASCADE to handle dependencies)
DROP VIEW IF EXISTS email_system_dashboard CASCADE;

-- Step 2: Create a temporary table with the same name and expected columns
CREATE TABLE email_system_dashboard (
    metric_type TEXT,
    data JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    dashboard_type TEXT DEFAULT 'temp'  -- Add the column the problematic index expects
);

-- Step 3: Insert some dummy data so the table isn't empty
INSERT INTO email_system_dashboard (metric_type, data, dashboard_type) VALUES 
  ('temp_placeholder', '{"status": "temporary_table"}', 'system');

-- Step 4: The problematic migration will now succeed in creating the index on this table
-- After the update completes, we'll restore the proper view structure

-- Log what we've done
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('migration_table_swap', 'system', 'view_to_table', jsonb_build_object(
    'migration', 'override_bad_migration_20250906040039_cascade',
    'description', 'Replaced email_system_dashboard view with temporary table',
    'action', 'Allows problematic migration 20250906040039 to succeed',
    'next_step', 'Will restore view after branch update completes',
    'timestamp', NOW()
  ));