-- Fix function return types to match what the merge migrations expect
-- The migrations expect JSON return type, but we created JSONB

-- Drop all the problematic functions so they can be recreated with correct return types
DROP FUNCTION IF EXISTS get_comprehensive_email_health(INTEGER);
DROP FUNCTION IF EXISTS get_email_metrics_by_template(INTEGER);
DROP FUNCTION IF EXISTS get_email_performance_trends(INTEGER);
DROP FUNCTION IF EXISTS check_email_system_alerts();

-- Also check for any other variations of these functions
DROP FUNCTION IF EXISTS get_comprehensive_email_health(integer);
DROP FUNCTION IF EXISTS get_email_metrics_by_template(integer);
DROP FUNCTION IF EXISTS get_email_performance_trends(integer);

-- Create minimal placeholder functions that return JSON (not JSONB)
-- These will be properly replaced by the merge migrations

CREATE OR REPLACE FUNCTION get_comprehensive_email_health(p_hours_back integer DEFAULT 24)
RETURNS json AS $$
BEGIN
  RETURN '{"status": "placeholder", "message": "Will be replaced by merge migration"}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_email_metrics_by_template(p_hours_back integer DEFAULT 24)
RETURNS json AS $$
BEGIN
  RETURN '{"status": "placeholder", "message": "Will be replaced by merge migration"}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_email_performance_trends(p_days_back integer DEFAULT 7)
RETURNS json AS $$
BEGIN
  RETURN '{"status": "placeholder", "message": "Will be replaced by merge migration"}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_email_system_alerts()
RETURNS json AS $$
BEGIN
  RETURN '{"status": "placeholder", "message": "Will be replaced by merge migration"}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_comprehensive_email_health(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_email_metrics_by_template(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_email_performance_trends(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_email_system_alerts() TO authenticated, service_role;

-- Log this fix
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('function_return_type_fix', 'system', 'merge_preparation', jsonb_build_object(
    'migration', 'fix_function_return_types_for_merge',
    'description', 'Fixed function return types from JSONB to JSON for merge compatibility',
    'functions_fixed', '["get_comprehensive_email_health", "get_email_metrics_by_template", "get_email_performance_trends", "check_email_system_alerts"]',
    'return_type_changed', 'JSONB -> JSON',
    'timestamp', NOW()
  ));