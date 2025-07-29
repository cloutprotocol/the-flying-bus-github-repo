-- Create function to get invitation trends data
CREATE OR REPLACE FUNCTION get_invitation_trends(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  date TEXT,
  requests INTEGER,
  approvals INTEGER,
  claims INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      start_date::DATE,
      end_date::DATE,
      '1 day'::INTERVAL
    )::DATE as day
  ),
  daily_requests AS (
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as requests
    FROM invitation_requests
    WHERE created_at >= start_date AND created_at <= end_date
    GROUP BY DATE(created_at)
  ),
  daily_approvals AS (
    SELECT 
      DATE(reviewed_at) as day,
      COUNT(*) as approvals
    FROM invitation_requests
    WHERE reviewed_at >= start_date 
      AND reviewed_at <= end_date 
      AND status = 'approved'
    GROUP BY DATE(reviewed_at)
  ),
  daily_claims AS (
    SELECT 
      DATE(invitation_claimed_at) as day,
      COUNT(*) as claims
    FROM invitation_requests
    WHERE invitation_claimed_at >= start_date 
      AND invitation_claimed_at <= end_date
    GROUP BY DATE(invitation_claimed_at)
  )
  SELECT 
    ds.day::TEXT as date,
    COALESCE(dr.requests, 0)::INTEGER as requests,
    COALESCE(da.approvals, 0)::INTEGER as approvals,
    COALESCE(dc.claims, 0)::INTEGER as claims
  FROM date_series ds
  LEFT JOIN daily_requests dr ON ds.day = dr.day
  LEFT JOIN daily_approvals da ON ds.day = da.day
  LEFT JOIN daily_claims dc ON ds.day = dc.day
  ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql;

-- Create function to get invitation performance metrics
CREATE OR REPLACE FUNCTION get_invitation_performance_metrics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'average_processing_time'::TEXT as metric_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600), 
      0
    )::NUMERIC as metric_value,
    'hours'::TEXT as metric_unit
  FROM invitation_requests
  WHERE reviewed_at IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'conversion_rate'::TEXT as metric_name,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'approved') > 0 THEN
        (COUNT(*) FILTER (WHERE invitation_claimed_at IS NOT NULL)::NUMERIC / 
         COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC * 100)
      ELSE 0
    END as metric_value,
    'percentage'::TEXT as metric_unit
  FROM invitation_requests
  
  UNION ALL
  
  SELECT 
    'email_delivery_rate'::TEXT as metric_name,
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE delivery_status = 'sent')::NUMERIC / 
         COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as metric_value,
    'percentage'::TEXT as metric_unit
  FROM email_notifications
  
  UNION ALL
  
  SELECT 
    'token_expiry_rate'::TEXT as metric_name,
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE expires_at < NOW() AND used_at IS NULL)::NUMERIC / 
         COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as metric_value,
    'percentage'::TEXT as metric_unit
  FROM invitation_tokens;
END;
$$ LANGUAGE plpgsql;

-- Create view for invitation analytics dashboard
CREATE OR REPLACE VIEW invitation_analytics_summary AS
SELECT 
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
  COUNT(*) FILTER (WHERE status = 'denied') as denied_requests,
  COUNT(*) FILTER (WHERE invitation_claimed_at IS NOT NULL) as claimed_invitations,
  COUNT(*) FILTER (WHERE status = 'approved' AND invitation_claimed_at IS NULL) as unclaimed_invitations,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'approved') > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE invitation_claimed_at IS NOT NULL)::NUMERIC / 
             COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC * 100), 2)
    ELSE 0
  END as conversion_rate
FROM invitation_requests;

-- Create performance monitoring tables
CREATE TABLE performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE alert_type AS ENUM ('email_delivery_slow', 'token_generation_slow', 'high_error_rate', 'system_degradation');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type alert_type NOT NULL,
  message TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'medium',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_success ON performance_metrics(success);
CREATE INDEX idx_performance_alerts_resolved ON performance_alerts(resolved);
CREATE INDEX idx_performance_alerts_timestamp ON performance_alerts(timestamp);

-- Grant permissions for the analytics functions
GRANT EXECUTE ON FUNCTION get_invitation_trends(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_performance_metrics() TO authenticated;
GRANT SELECT ON invitation_analytics_summary TO authenticated;

-- Grant permissions for performance monitoring tables
GRANT SELECT, INSERT, UPDATE ON performance_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON performance_alerts TO authenticated;