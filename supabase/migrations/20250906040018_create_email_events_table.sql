-- Create email_events table for production
-- This table is required for email logging functionality

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  email TEXT NOT NULL,
  template TEXT,
  message_id TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_events_type_timestamp ON email_events(type, timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);

-- Add RLS policy
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all email events
CREATE POLICY "Service role can manage email events" ON email_events
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to view their own email events
CREATE POLICY "Users can view their own email events" ON email_events
  FOR SELECT USING (email = auth.email());

-- Grant permissions
GRANT ALL ON email_events TO service_role;
GRANT SELECT ON email_events TO authenticated;

-- Add comment
COMMENT ON TABLE email_events IS 'Stores email event logs for monitoring and debugging';

-- Test the table creation
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('migration', 'system', 'table_creation', jsonb_build_object(
    'migration', 'create_email_events_table',
    'description', 'Created email_events table for production',
    'timestamp', NOW()
  ));

-- Verify the table was created
SELECT COUNT(*) as email_events_count FROM email_events;