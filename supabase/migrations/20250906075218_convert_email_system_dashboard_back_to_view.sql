-- Convert email_system_dashboard back to a view so the merge migration can drop it
-- The migration expects it to be a view, not a table

-- Drop the table we created earlier
DROP TABLE IF EXISTS email_system_dashboard CASCADE;

-- Create a simple view that the migration can drop and replace
CREATE VIEW email_system_dashboard AS
SELECT 
    'placeholder'::text AS metric_type,
    '{"status": "temporary_view"}'::jsonb AS data,
    NOW() AS last_updated;

-- Log this conversion
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('table_to_view_conversion', 'system', 'merge_preparation', jsonb_build_object(
    'migration', 'convert_email_system_dashboard_back_to_view',
    'description', 'Converted email_system_dashboard from table back to view for merge compatibility',
    'purpose', 'Allow merge migration to DROP VIEW and recreate properly',
    'timestamp', NOW()
  ));
