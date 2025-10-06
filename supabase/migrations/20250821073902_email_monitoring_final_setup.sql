-- Grant permissions on all new functions
GRANT EXECUTE ON FUNCTION log_trigger_email_event(text, text, text, text, boolean, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_fallback_email_event(text, text, text, boolean, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_comprehensive_email_health(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_email_metrics_by_template(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_email_performance_trends(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_failed_email_audit_trail(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_email_system_alerts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_email_logs(integer) TO authenticated, service_role;

-- Add helpful comments
COMMENT ON FUNCTION log_trigger_email_event(text, text, text, text, boolean, text, jsonb) IS 'Enhanced logging function for database trigger email operations';
COMMENT ON FUNCTION log_fallback_email_event(text, text, text, boolean, text, text, jsonb) IS 'Enhanced logging function for client-side fallback email operations';
COMMENT ON FUNCTION get_comprehensive_email_health(integer) IS 'Comprehensive email system health monitoring with detailed statistics';
COMMENT ON FUNCTION get_email_metrics_by_template(integer) IS 'Email delivery metrics broken down by template type';
COMMENT ON FUNCTION get_email_performance_trends(integer) IS 'Email system performance trends over time';
COMMENT ON FUNCTION get_failed_email_audit_trail(integer, integer) IS 'Audit trail for failed email operations requiring manual follow-up';
COMMENT ON FUNCTION check_email_system_alerts() IS 'Check for email system health alerts and issues requiring attention';
COMMENT ON FUNCTION cleanup_old_email_logs(integer) IS 'Cleanup old email events, audit logs, and metrics';

-- Drop existing view if it exists
DROP VIEW IF EXISTS email_system_dashboard;

-- Create a view for easy monitoring dashboard queries
CREATE VIEW email_system_dashboard AS
SELECT 
  'current_health' as metric_type,
  get_comprehensive_email_health(24) as data,
  NOW() as last_updated
UNION ALL
SELECT 
  'template_metrics' as metric_type,
  get_email_metrics_by_template(24) as data,
  NOW() as last_updated
UNION ALL
SELECT 
  'performance_trends' as metric_type,
  get_email_performance_trends(7) as data,
  NOW() as last_updated
UNION ALL
SELECT 
  'system_alerts' as metric_type,
  check_email_system_alerts() as data,
  NOW() as last_updated;

-- Grant access to the dashboard view
GRANT SELECT ON email_system_dashboard TO authenticated, service_role;

-- Log the completion of this migration
INSERT INTO email_events (
  type,
  email,
  template,
  message_id,
  error,
  metadata
) VALUES (
  'migration_completed',
  'system',
  'comprehensive_logging_monitoring',
  'migration_' || gen_random_uuid()::text,
  NULL,
  jsonb_build_object(
    'migration_name', 'comprehensive_email_logging_monitoring',
    'description', 'Added comprehensive email event logging and monitoring functions',
    'functions_added', array[
      'log_trigger_email_event',
      'log_fallback_email_event', 
      'get_comprehensive_email_health',
      'get_email_metrics_by_template',
      'get_email_performance_trends',
      'get_failed_email_audit_trail',
      'check_email_system_alerts',
      'cleanup_old_email_logs'
    ],
    'views_added', array['email_system_dashboard'],
    'completed_at', NOW()
  )
);