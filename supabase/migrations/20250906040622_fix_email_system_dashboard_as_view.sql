-- Fix email_system_dashboard - should be a view, not a table

-- Drop the incorrectly created table
DROP TABLE IF EXISTS email_system_dashboard CASCADE;

-- Create placeholder functions that the view depends on
-- These will be properly implemented when the full email system migrations are applied

CREATE OR REPLACE FUNCTION get_comprehensive_email_health(hours_back INTEGER DEFAULT 24)
RETURNS JSONB AS $$
BEGIN
  -- Placeholder implementation
  RETURN jsonb_build_object(
    'status', 'placeholder',
    'message', 'Function will be implemented with full email system',
    'hours_back', hours_back,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_email_metrics_by_template(hours_back INTEGER DEFAULT 24)
RETURNS JSONB AS $$
BEGIN
  -- Placeholder implementation
  RETURN jsonb_build_object(
    'status', 'placeholder',
    'message', 'Function will be implemented with full email system',
    'hours_back', hours_back,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_email_performance_trends(days_back INTEGER DEFAULT 7)
RETURNS JSONB AS $$
BEGIN
  -- Placeholder implementation
  RETURN jsonb_build_object(
    'status', 'placeholder',
    'message', 'Function will be implemented with full email system',
    'days_back', days_back,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_email_system_alerts()
RETURNS JSONB AS $$
BEGIN
  -- Placeholder implementation
  RETURN jsonb_build_object(
    'status', 'placeholder',
    'message', 'Function will be implemented with full email system',
    'alerts', '[]'::jsonb,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create the view with the same definition as preview branch
CREATE VIEW email_system_dashboard AS
SELECT 'current_health'::text AS metric_type,
    get_comprehensive_email_health(24) AS data,
    now() AS last_updated
UNION ALL
SELECT 'template_metrics'::text AS metric_type,
    get_email_metrics_by_template(24) AS data,
    now() AS last_updated
UNION ALL
SELECT 'performance_trends'::text AS metric_type,
    get_email_performance_trends(7) AS data,
    now() AS last_updated
UNION ALL
SELECT 'system_alerts'::text AS metric_type,
    check_email_system_alerts() AS data,
    now() AS last_updated;

-- Grant permissions on the view
GRANT SELECT ON email_system_dashboard TO authenticated;
GRANT SELECT ON email_system_dashboard TO service_role;

-- Grant permissions on the functions
GRANT EXECUTE ON FUNCTION get_comprehensive_email_health(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_metrics_by_template(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_performance_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_system_alerts() TO authenticated;

GRANT EXECUTE ON FUNCTION get_comprehensive_email_health(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_email_metrics_by_template(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_email_performance_trends(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION check_email_system_alerts() TO service_role;

-- Test the view
SELECT metric_type, last_updated FROM email_system_dashboard LIMIT 1;