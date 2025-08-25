-- Production setup for Email Notification System
-- This migration sets up RLS policies, indexes, and monitoring for production

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    user_email TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Create email_metrics table for monitoring
CREATE TABLE IF NOT EXISTS email_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- 'sent', 'delivered', 'bounced', 'failed'
    email_type TEXT NOT NULL, -- 'invitation_confirmation', 'invitation_approved', etc.
    recipient_email TEXT NOT NULL,
    message_id TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email_metrics
CREATE INDEX IF NOT EXISTS idx_email_metrics_type ON email_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_email_type ON email_metrics(email_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_created_at ON email_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_email_metrics_recipient ON email_metrics(recipient_email);

-- Create rate_limits table for tracking API usage
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- email address or IP
    action TEXT NOT NULL, -- 'invitation_request', 'token_validation', etc.
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for rate_limits
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique ON rate_limits(identifier, action, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_end);

-- Enhanced RLS policies for invitation_tokens
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access own invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Admins can access all invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON invitation_tokens;

-- Policy for users to access their own tokens
CREATE POLICY "Users can access own invitation tokens" ON invitation_tokens
    FOR SELECT USING (
        email = auth.jwt() ->> 'email' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );

-- Policy for service operations (Edge Functions)
CREATE POLICY "Service role can manage all tokens" ON invitation_tokens
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can access audit logs
DROP POLICY IF EXISTS "Admins can access audit logs" ON audit_logs;
CREATE POLICY "Admins can access audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'moderator')
        ) OR
        auth.role() = 'service_role'
    );

-- Service role can insert audit logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
    );

-- RLS policies for email_metrics
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can access email metrics
CREATE POLICY "Admins can access email metrics" ON email_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'moderator')
        ) OR
        auth.role() = 'service_role'
    );

-- Service role can insert email metrics
CREATE POLICY "Service role can insert email metrics" ON email_metrics
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
    );

-- RLS policies for rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON rate_limits
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Enhanced RLS policies for invitation_requests
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "Admins can manage all invitation requests" ON invitation_requests;

-- Users can view their own invitation requests
CREATE POLICY "Users can view own invitation requests" ON invitation_requests
    FOR SELECT USING (
        parent_email = auth.jwt() ->> 'email' OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );

-- Users can create invitation requests
CREATE POLICY "Users can create invitation requests" ON invitation_requests
    FOR INSERT WITH CHECK (
        parent_email = auth.jwt() ->> 'email' OR
        auth.role() = 'service_role'
    );

-- Admins can manage all invitation requests
CREATE POLICY "Admins can manage invitation requests" ON invitation_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'moderator')
        ) OR
        auth.role() = 'service_role'
    );

-- Function to cleanup expired invitation tokens
CREATE OR REPLACE FUNCTION cleanup_expired_invitation_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens that expired more than 24 hours ago
    DELETE FROM invitation_tokens 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        success,
        metadata
    ) VALUES (
        'token_cleanup',
        'invitation_token',
        'batch_cleanup',
        true,
        jsonb_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete rate limit records older than 7 days
    DELETE FROM rate_limits 
    WHERE window_end < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs older than 90 days
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old email metrics
CREATE OR REPLACE FUNCTION cleanup_old_email_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete email metrics older than 30 days
    DELETE FROM email_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email system health metrics
CREATE OR REPLACE FUNCTION get_email_system_health()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_sent INTEGER;
    total_failed INTEGER;
    success_rate DECIMAL;
    active_tokens INTEGER;
    expired_tokens INTEGER;
BEGIN
    -- Get email metrics for the last 24 hours
    SELECT 
        COUNT(*) FILTER (WHERE metric_type IN ('sent', 'delivered')),
        COUNT(*) FILTER (WHERE metric_type IN ('failed', 'bounced'))
    INTO total_sent, total_failed
    FROM email_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    -- Calculate success rate
    IF (total_sent + total_failed) > 0 THEN
        success_rate := (total_sent::DECIMAL / (total_sent + total_failed)) * 100;
    ELSE
        success_rate := 100;
    END IF;
    
    -- Get token statistics
    SELECT 
        COUNT(*) FILTER (WHERE expires_at > NOW() AND used_at IS NULL),
        COUNT(*) FILTER (WHERE expires_at <= NOW())
    INTO active_tokens, expired_tokens
    FROM invitation_tokens;
    
    -- Build result JSON
    result := json_build_object(
        'email_metrics', json_build_object(
            'total_sent_24h', total_sent,
            'total_failed_24h', total_failed,
            'success_rate_24h', success_rate
        ),
        'token_metrics', json_build_object(
            'active_tokens', active_tokens,
            'expired_tokens', expired_tokens
        ),
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup jobs (these will be created via the deployment script)
-- Note: These are commented out as they need to be created after pg_cron is properly configured

-- Daily cleanup of expired tokens at 2 AM
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_invitation_tokens();');

-- Weekly cleanup of old rate limits on Sundays at 3 AM
-- SELECT cron.schedule('cleanup-old-rate-limits', '0 3 * * 0', 'SELECT cleanup_old_rate_limits();');

-- Monthly cleanup of old audit logs on the 1st at 4 AM
-- SELECT cron.schedule('cleanup-old-audit-logs', '0 4 1 * *', 'SELECT cleanup_old_audit_logs();');

-- Monthly cleanup of old email metrics on the 1st at 5 AM
-- SELECT cron.schedule('cleanup-old-email-metrics', '0 5 1 * *', 'SELECT cleanup_old_email_metrics();');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_invitation_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_email_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION get_email_system_health() TO service_role;

-- Create a view for email system dashboard
CREATE OR REPLACE VIEW email_system_dashboard AS
SELECT 
    -- Recent email activity
    (SELECT COUNT(*) FROM email_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as emails_last_hour,
    (SELECT COUNT(*) FROM email_metrics WHERE created_at > NOW() - INTERVAL '24 hours') as emails_last_24h,
    (SELECT COUNT(*) FROM email_metrics WHERE created_at > NOW() - INTERVAL '7 days') as emails_last_week,
    
    -- Success rates
    (SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE (COUNT(*) FILTER (WHERE metric_type IN ('sent', 'delivered'))::DECIMAL / COUNT(*)) * 100
        END
     FROM email_metrics 
     WHERE created_at > NOW() - INTERVAL '24 hours'
    ) as success_rate_24h,
    
    -- Token statistics
    (SELECT COUNT(*) FROM invitation_tokens WHERE expires_at > NOW() AND used_at IS NULL) as active_tokens,
    (SELECT COUNT(*) FROM invitation_tokens WHERE used_at IS NOT NULL) as used_tokens,
    (SELECT COUNT(*) FROM invitation_tokens WHERE expires_at <= NOW()) as expired_tokens,
    
    -- Recent errors
    (SELECT COUNT(*) FROM audit_logs WHERE success = false AND created_at > NOW() - INTERVAL '1 hour') as errors_last_hour,
    (SELECT COUNT(*) FROM audit_logs WHERE success = false AND created_at > NOW() - INTERVAL '24 hours') as errors_last_24h;

-- Grant access to the dashboard view
GRANT SELECT ON email_system_dashboard TO service_role;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for all email and token operations';
COMMENT ON TABLE email_metrics IS 'Metrics and tracking for email delivery';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking for API endpoints';
COMMENT ON FUNCTION cleanup_expired_invitation_tokens() IS 'Cleanup function for expired invitation tokens';
COMMENT ON FUNCTION get_email_system_health() IS 'Health check function for email system monitoring';
COMMENT ON VIEW email_system_dashboard IS 'Dashboard view for email system metrics and monitoring';