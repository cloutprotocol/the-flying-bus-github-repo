-- Part 2: Create indexes and views for improved audit logging

-- Create indexes to improve performance for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_agent ON audit_logs(user_agent) WHERE user_agent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION log_audit_simple(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_simple(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB, TEXT, TEXT) IS 'Comprehensive audit logging function with graceful handling of missing fields';
COMMENT ON FUNCTION log_audit_simple(TEXT, TEXT, TEXT, BOOLEAN, TEXT) IS 'Simplified audit logging function for common use cases';

-- Create a view for recent audit events with better formatting
CREATE OR REPLACE VIEW recent_audit_events AS
SELECT 
    id,
    action,
    resource_type,
    resource_id,
    user_email,
    user_id,
    success,
    error_message,
    CASE 
        WHEN user_agent = 'system/unknown' THEN 'System'
        WHEN user_agent = 'system/function' THEN 'Database Function'
        WHEN user_agent = 'system/error' THEN 'Error Getting User Agent'
        ELSE COALESCE(user_agent, 'Unknown')
    END as formatted_user_agent,
    CASE 
        WHEN ip_address = 'unknown' THEN 'Unknown'
        WHEN ip_address = 'system' THEN 'System'
        ELSE COALESCE(ip_address, 'Unknown')
    END as formatted_ip_address,
    metadata,
    created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON recent_audit_events TO authenticated;
GRANT SELECT ON recent_audit_events TO service_role;

COMMENT ON VIEW recent_audit_events IS 'Recent audit events with formatted user agent and IP address fields';