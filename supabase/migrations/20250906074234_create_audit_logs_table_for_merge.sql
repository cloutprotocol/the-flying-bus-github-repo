-- Create audit_logs table on production to support merge
-- This table is needed by migration 20250821073729_comprehensive_email_logging_monitoring.sql

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    user_email TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_id UUID,
    user_agent TEXT
);

-- Create indexes that the migration expects
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid() OR user_email = auth.email());

-- Grant permissions
GRANT ALL ON audit_logs TO service_role;
GRANT SELECT ON audit_logs TO authenticated;

-- Add comment
COMMENT ON TABLE audit_logs IS 'Stores audit trail for system actions and user activities';

-- Test insert
INSERT INTO audit_logs (action, resource_type, resource_id, user_email, success, metadata) VALUES 
  ('table_creation', 'audit_logs', 'system', 'system@example.com', true, jsonb_build_object(
    'migration', 'create_audit_logs_table_for_merge',
    'description', 'Created audit_logs table to support merge process',
    'timestamp', NOW()
  ));

-- Verify table was created
SELECT COUNT(*) as audit_logs_count FROM audit_logs;