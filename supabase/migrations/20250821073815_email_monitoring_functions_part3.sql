-- Function to get email delivery metrics by template type
CREATE OR REPLACE FUNCTION get_email_metrics_by_template(
  p_hours_back integer DEFAULT 24
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'template', template,
      'total_attempts', total_attempts,
      'successful_sends', successful_sends,
      'failed_sends', failed_sends,
      'success_rate', success_rate,
      'last_sent', last_sent
    ) ORDER BY total_attempts DESC
  ) INTO result
  FROM (
    SELECT 
      template,
      COUNT(*) as total_attempts,
      COUNT(*) FILTER (WHERE type IN ('sent', 'delivered')) as successful_sends,
      COUNT(*) FILTER (WHERE type IN ('failed', 'bounced')) as failed_sends,
      CASE 
        WHEN COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE type IN ('sent', 'delivered'))::decimal / 
           COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
        )
        ELSE 100
      END as success_rate,
      MAX(timestamp) FILTER (WHERE type IN ('sent', 'delivered')) as last_sent
    FROM email_events 
    WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval
    GROUP BY template
  ) template_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor email system performance trends
CREATE OR REPLACE FUNCTION get_email_performance_trends(
  p_days_back integer DEFAULT 7
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'date', date_bucket,
      'total_emails', total_emails,
      'successful_emails', successful_emails,
      'failed_emails', failed_emails,
      'success_rate', success_rate,
      'trigger_attempts', trigger_attempts,
      'fallback_attempts', fallback_attempts
    ) ORDER BY date_bucket
  ) INTO result
  FROM (
    SELECT 
      DATE_TRUNC('day', timestamp) as date_bucket,
      COUNT(*) as total_emails,
      COUNT(*) FILTER (WHERE type IN ('sent', 'delivered')) as successful_emails,
      COUNT(*) FILTER (WHERE type IN ('failed', 'bounced')) as failed_emails,
      CASE 
        WHEN COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE type IN ('sent', 'delivered'))::decimal / 
           COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
        )
        ELSE 100
      END as success_rate,
      COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger') as trigger_attempts,
      COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback') as fallback_attempts
    FROM email_events 
    WHERE timestamp > NOW() - (p_days_back || ' days')::interval
    GROUP BY DATE_TRUNC('day', timestamp)
  ) daily_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for failed email operations
CREATE OR REPLACE FUNCTION get_failed_email_audit_trail(
  p_hours_back integer DEFAULT 24,
  p_limit integer DEFAULT 50
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'audit_id', a.id,
      'timestamp', a.created_at,
      'action', a.action,
      'user_email', a.user_email,
      'error_message', a.error_message,
      'email_event_details', json_build_object(
        'event_id', e.id,
        'type', e.type,
        'template', e.template,
        'error', e.error,
        'metadata', e.metadata
      ),
      'requires_manual_followup', CASE 
        WHEN a.error_message ILIKE '%configuration%' OR 
             a.error_message ILIKE '%authentication%' OR
             a.error_message ILIKE '%network%' 
        THEN true 
        ELSE false 
      END
    ) ORDER BY a.created_at DESC
  ) INTO result
  FROM audit_logs a
  LEFT JOIN email_events e ON e.id::text = a.resource_id
  WHERE a.created_at > NOW() - (p_hours_back || ' hours')::interval
    AND a.success = false
    AND a.action LIKE '%email%'
  LIMIT p_limit;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
