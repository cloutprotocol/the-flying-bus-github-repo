-- Create security audit log table for invitation security tracking
-- Requirements: 6.3

-- Create enum for event severity levels
CREATE TYPE security_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create security audit log table
CREATE TABLE security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  ip_address INET NOT NULL,
  email TEXT,
  token_hash TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES invitation_requests(id) ON DELETE SET NULL,
  event_details JSONB,
  severity security_severity NOT NULL DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX idx_security_audit_log_ip_address ON security_audit_log(ip_address);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX idx_security_audit_log_severity ON security_audit_log(severity);
CREATE INDEX idx_security_audit_log_token_hash ON security_audit_log(token_hash);
CREATE INDEX idx_security_audit_log_email ON security_audit_log(email);

-- Create composite indexes for common queries
CREATE INDEX idx_security_audit_log_ip_event_time ON security_audit_log(ip_address, event_type, created_at);
CREATE INDEX idx_security_audit_log_token_event_time ON security_audit_log(token_hash, event_type, created_at);

-- Enable Row Level Security
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin can view security audit log" ON security_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create policy for system inserts (no user context required)
CREATE POLICY "System can insert security events" ON security_audit_log
  FOR INSERT WITH CHECK (true);

-- Create function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 90 days, except critical events (keep for 1 year)
  DELETE FROM security_audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND severity != 'critical';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete critical events older than 1 year
  DELETE FROM security_audit_log 
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND severity = 'critical';
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get security statistics
CREATE OR REPLACE FUNCTION get_security_statistics(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  total_events BIGINT,
  high_severity_events BIGINT,
  rate_limit_violations BIGINT,
  suspicious_activity_detections BIGINT,
  unique_ip_addresses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE severity IN ('high', 'critical')) as high_severity_events,
    COUNT(*) FILTER (WHERE event_type LIKE '%rate_limit%') as rate_limit_violations,
    COUNT(*) FILTER (WHERE event_type = 'suspicious_activity_detected') as suspicious_activity_detections,
    COUNT(DISTINCT ip_address) as unique_ip_addresses
  FROM security_audit_log
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE security_audit_log IS 'Audit log for security events in the invitation system';
COMMENT ON COLUMN security_audit_log.event_type IS 'Type of security event (e.g., token_validation_attempt, rate_limit_exceeded)';
COMMENT ON COLUMN security_audit_log.ip_address IS 'IP address of the client making the request';
COMMENT ON COLUMN security_audit_log.token_hash IS 'Hashed version of the token for identification (not the actual token)';
COMMENT ON COLUMN security_audit_log.event_details IS 'Additional details about the security event in JSON format';
COMMENT ON COLUMN security_audit_log.severity IS 'Severity level of the security event';