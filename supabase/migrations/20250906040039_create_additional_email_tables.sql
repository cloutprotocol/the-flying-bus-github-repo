-- Create additional email system tables for full compatibility

-- Create email_metrics table
CREATE TABLE IF NOT EXISTS email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_system_dashboard table (view-like table for dashboard data)
CREATE TABLE IF NOT EXISTS email_system_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_metrics_name_period ON email_metrics(metric_name, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_email_metrics_type ON email_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_email_system_dashboard_type ON email_system_dashboard(dashboard_type);

-- Enable RLS
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_system_dashboard ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_metrics
CREATE POLICY "Service role can manage email metrics" ON email_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view email metrics" ON email_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS policies for email_system_dashboard
CREATE POLICY "Service role can manage email dashboard" ON email_system_dashboard
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view email dashboard" ON email_system_dashboard
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON email_metrics TO service_role;
GRANT SELECT ON email_metrics TO authenticated;
GRANT ALL ON email_system_dashboard TO service_role;
GRANT SELECT ON email_system_dashboard TO authenticated;

-- Add comments
COMMENT ON TABLE email_metrics IS 'Stores email system metrics and analytics';
COMMENT ON TABLE email_system_dashboard IS 'Stores dashboard data for email system monitoring';

-- Test the tables
INSERT INTO email_metrics (metric_name, metric_value, metric_type, period_start, period_end, metadata) VALUES 
  ('table_creation', 1, 'system', NOW(), NOW(), jsonb_build_object(
    'migration', 'create_additional_email_tables',
    'description', 'Created additional email system tables',
    'timestamp', NOW()
  ));

INSERT INTO email_system_dashboard (dashboard_type, data) VALUES 
  ('system_status', jsonb_build_object(
    'status', 'initialized',
    'migration', 'create_additional_email_tables',
    'timestamp', NOW()
  ));

-- Verify tables were created
SELECT 
  'email_events' as table_name, COUNT(*) as row_count FROM email_events
UNION ALL
SELECT 
  'email_metrics' as table_name, COUNT(*) as row_count FROM email_metrics
UNION ALL
SELECT 
  'email_system_dashboard' as table_name, COUNT(*) as row_count FROM email_system_dashboard;