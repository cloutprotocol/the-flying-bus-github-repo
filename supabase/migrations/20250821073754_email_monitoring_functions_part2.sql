-- Enhanced logging function for client-side fallback operations
CREATE OR REPLACE FUNCTION log_fallback_email_event(
  p_event_type text,
  p_email text,
  p_template text,
  p_success boolean,
  p_message_id text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO email_events (
    type,
    email,
    template,
    message_id,
    error,
    metadata
  ) VALUES (
    p_event_type,
    p_email,
    p_template,
    p_message_id,
    p_error_message,
    p_metadata || jsonb_build_object(
      'method', 'client_fallback',
      'success', p_success,
      'logged_at', NOW(),
      'source', 'client_fallback'
    )
  ) RETURNING id INTO v_event_id;
  
  -- Also log to audit_logs for tracking
  INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    user_email,
    success,
    error_message,
    metadata
  ) VALUES (
    CASE WHEN p_success THEN 'email_sent_fallback' ELSE 'email_failed_fallback' END,
    'email_event',
    v_event_id::text,
    p_email,
    p_success,
    p_error_message,
    p_metadata || jsonb_build_object(
      'event_type', p_event_type,
      'template', p_template,
      'method', 'client_fallback'
    )
  );
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprehensive email system health monitoring function
CREATE OR REPLACE FUNCTION get_comprehensive_email_health(
  p_hours_back integer DEFAULT 24
) RETURNS json AS $$
DECLARE
  result json;
  email_stats json;
  trigger_stats json;
  fallback_stats json;
  error_analysis json;
  recent_failures json[];
  config_health json;
BEGIN
  -- Get overall email statistics
  SELECT json_build_object(
    'total_events', COUNT(*),
    'successful_sends', COUNT(*) FILTER (WHERE type IN ('sent', 'delivered')),
    'failed_sends', COUNT(*) FILTER (WHERE type IN ('failed', 'bounced')),
    'pending_sends', COUNT(*) FILTER (WHERE type IN ('sending', 'queued')),
    'skipped_sends', COUNT(*) FILTER (WHERE type = 'skipped'),
    'success_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE type IN ('sent', 'delivered'))::decimal / 
         COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
      )
      ELSE 100
    END
  ) INTO email_stats
  FROM email_events 
  WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval;

  -- Get trigger-specific statistics
  SELECT json_build_object(
    'trigger_attempts', COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger'),
    'trigger_successes', COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered')),
    'trigger_failures', COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('failed', 'bounced')),
    'trigger_success_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered'))::decimal / 
         COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
      )
      ELSE 100
    END
  ) INTO trigger_stats
  FROM email_events 
  WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval;

  -- Get fallback-specific statistics
  SELECT json_build_object(
    'fallback_attempts', COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback'),
    'fallback_successes', COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered')),
    'fallback_failures', COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('failed', 'bounced')),
    'fallback_success_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered'))::decimal / 
         COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
      )
      ELSE 100
    END
  ) INTO fallback_stats
  FROM email_events 
  WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval;

  -- Analyze error patterns
  SELECT json_build_object(
    'common_errors', json_agg(error_summary ORDER BY error_count DESC)
  ) INTO error_analysis
  FROM (
    SELECT 
      COALESCE(error, 'Unknown error') as error_type,
      COUNT(*) as error_count,
      json_build_object(
        'error_type', COALESCE(error, 'Unknown error'),
        'count', COUNT(*),
        'templates_affected', array_agg(DISTINCT template),
        'last_occurrence', MAX(timestamp)
      ) as error_summary
    FROM email_events 
    WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval
      AND type IN ('failed', 'bounced')
      AND error IS NOT NULL
    GROUP BY error
    LIMIT 10
  ) error_groups;

  -- Get recent critical failures
  SELECT array_agg(
    json_build_object(
      'timestamp', timestamp,
      'email', email,
      'template', template,
      'error', error,
      'metadata', metadata
    ) ORDER BY timestamp DESC
  ) INTO recent_failures
  FROM email_events 
  WHERE timestamp > NOW() - INTERVAL '1 hour'
    AND type IN ('failed', 'bounced')
  LIMIT 5;

  -- Get configuration health
  SELECT validate_email_configuration() INTO config_health;

  -- Build comprehensive result
  result := json_build_object(
    'timestamp', NOW(),
    'period_hours', p_hours_back,
    'overall_stats', email_stats,
    'trigger_stats', trigger_stats,
    'fallback_stats', fallback_stats,
    'error_analysis', error_analysis,
    'recent_failures', COALESCE(recent_failures, '{}'),
    'configuration_health', config_health,
    'system_status', CASE 
      WHEN (email_stats->>'success_rate')::decimal >= 95 THEN 'healthy'
      WHEN (email_stats->>'success_rate')::decimal >= 80 THEN 'warning'
      ELSE 'critical'
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
