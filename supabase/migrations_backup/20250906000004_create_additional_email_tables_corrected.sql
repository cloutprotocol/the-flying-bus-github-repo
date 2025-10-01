-- Create additional email system tables with correct structure
-- This migration creates email_metrics and email_system_dashboard tables
-- with the correct column structure matching the preview branch

-- Create email_metrics table with correct structure
CREATE TABLE IF NOT EXISTS email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create placeholder functions for email_system_dashboard view
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

-- Create email_system_dashboard view
CREATE OR REPLACE VIEW email_system_dashboard AS
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

-- Create indexes with correct column names
CREATE INDEX IF NOT EXISTS idx_email_metrics_type ON email_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_email_type ON email_metrics(email_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_recipient ON email_metrics(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_metrics_created_at ON email_metrics(created_at);

-- Enable RLS
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_metrics
CREATE POLICY "Service role can manage email metrics" ON email_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view email metrics" ON email_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON email_metrics TO service_role;
GRANT SELECT ON email_metrics TO authenticated;
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

-- Add comments
COMMENT ON TABLE email_metrics IS 'Stores email system metrics and analytics with correct structure';
COMMENT ON VIEW email_system_dashboard IS 'Dashboard view for email system monitoring';

-- Test the tables and view (only if they don't have data already)
DO $$
BEGIN
  -- Only insert test data if table is empty
  IF NOT EXISTS (SELECT 1 FROM email_metrics WHERE metric_type = 'table_creation' LIMIT 1) THEN
    INSERT INTO email_metrics (metric_type, email_type, recipient_email, metadata) VALUES 
      ('table_creation', 'system', 'system@example.com', jsonb_build_object(
        'migration', 'create_additional_email_tables_corrected',
        'description', 'Created additional email system tables with correct structure',
        'timestamp', NOW()
      ));
  END IF;
END $$;

-- Verify tables and view were created
DO $$
DECLARE
  email_events_count INTEGER;
  email_metrics_count INTEGER;
  email_dashboard_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO email_events_count FROM email_events;
  SELECT COUNT(*) INTO email_metrics_count FROM email_metrics;
  SELECT COUNT(*) INTO email_dashboard_count FROM email_system_dashboard;
  
  RAISE NOTICE 'Email system tables verified - events: %, metrics: %, dashboard view: %', 
    email_events_count, email_metrics_count, email_dashboard_count;
END $$;