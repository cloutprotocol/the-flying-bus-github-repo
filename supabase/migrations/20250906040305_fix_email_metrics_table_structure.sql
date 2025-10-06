-- Fix email_metrics table structure to match preview branch

-- Drop the incorrectly structured table
DROP TABLE IF EXISTS email_metrics CASCADE;

-- Recreate with correct structure matching preview branch
CREATE TABLE email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appropriate indexes
CREATE INDEX IF NOT EXISTS idx_email_metrics_type ON email_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_email_type ON email_metrics(email_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_recipient ON email_metrics(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_metrics_created_at ON email_metrics(created_at);

-- Enable RLS
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role can manage email metrics" ON email_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view email metrics" ON email_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON email_metrics TO service_role;
GRANT SELECT ON email_metrics TO authenticated;

-- Add comment
COMMENT ON TABLE email_metrics IS 'Stores email system metrics and analytics with correct structure';

-- Test insert
INSERT INTO email_metrics (metric_type, email_type, recipient_email, metadata) VALUES 
  ('table_fix', 'system', 'system@example.com', jsonb_build_object(
    'migration', 'fix_email_metrics_table_structure',
    'description', 'Fixed email_metrics table structure to match preview',
    'timestamp', NOW()
  ));