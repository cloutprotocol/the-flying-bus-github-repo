-- Function to create email system health alerts
CREATE OR REPLACE FUNCTION check_email_system_alerts() RETURNS json AS $$
DECLARE
  result json;
  alerts json[] := '{}';
  health_data json;
  recent_failures integer;
  config_issues json;
BEGIN
  -- Get current health data
  SELECT get_comprehensive_email_health(1) INTO health_data;
  
  -- Check for high failure rate in last hour
  IF (health_data->'overall_stats'->>'success_rate')::decimal < 80 THEN
    alerts := alerts || json_build_object(
      'severity', 'critical',
      'type', 'high_failure_rate',
      'message', 'Email success rate below 80% in the last hour',
      'current_rate', health_data->'overall_stats'->>'success_rate',
      'timestamp', NOW()
    );
  END IF;

  -- Check for configuration issues
  config_issues := health_data->'configuration_health';
  IF NOT (config_issues->>'configuration_valid')::boolean THEN
    alerts := alerts || json_build_object(
      'severity', 'critical',
      'type', 'configuration_invalid',
      'message', 'Email system configuration is invalid',
      'details', config_issues,
      'timestamp', NOW()
    );
  END IF;

  -- Check for recent failures requiring manual intervention
  SELECT COUNT(*) INTO recent_failures
  FROM audit_logs 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND success = false
    AND action LIKE '%email%'
    AND (error_message ILIKE '%configuration%' OR 
         error_message ILIKE '%authentication%' OR
         error_message ILIKE '%network%');

  IF recent_failures > 0 THEN
    alerts := alerts || json_build_object(
      'severity', 'warning',
      'type', 'manual_intervention_needed',
      'message', recent_failures || ' email failures require manual investigation',
      'failure_count', recent_failures,
      'timestamp', NOW()
    );
  END IF;

  -- Check if fallback usage is too high (indicates trigger problems)
  IF (health_data->'fallback_stats'->>'fallback_attempts')::integer > 
     (health_data->'trigger_stats'->>'trigger_attempts')::integer THEN
    alerts := alerts || json_build_object(
      'severity', 'warning',
      'type', 'high_fallback_usage',
      'message', 'Fallback email method being used more than triggers',
      'trigger_attempts', health_data->'trigger_stats'->>'trigger_attempts',
      'fallback_attempts', health_data->'fallback_stats'->>'fallback_attempts',
      'timestamp', NOW()
    );
  END IF;

  result := json_build_object(
    'timestamp', NOW(),
    'alert_count', array_length(alerts, 1),
    'alerts', alerts,
    'system_status', health_data->>'system_status'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old email events and audit logs
CREATE OR REPLACE FUNCTION cleanup_old_email_logs(
  p_days_to_keep integer DEFAULT 30
) RETURNS json AS $$
DECLARE
  deleted_events integer;
  deleted_audits integer;
  deleted_metrics integer;
BEGIN
  -- Delete old email events
  DELETE FROM email_events 
  WHERE timestamp < NOW() - (p_days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  -- Delete old audit logs
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::interval
    AND action LIKE '%email%';
  GET DIAGNOSTICS deleted_audits = ROW_COUNT;

  -- Delete old email metrics
  DELETE FROM email_metrics 
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_metrics = ROW_COUNT;

  RETURN json_build_object(
    'deleted_events', deleted_events,
    'deleted_audits', deleted_audits,
    'deleted_metrics', deleted_metrics,
    'cleanup_date', NOW(),
    'days_kept', p_days_to_keep
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
