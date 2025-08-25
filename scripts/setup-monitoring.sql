-- Production Monitoring Setup for Email Notification System
-- Run this script after deployment to set up monitoring and alerting

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Schedule cleanup jobs
-- Daily cleanup of expired tokens at 2 AM UTC
SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 2 * * *',
    'SELECT cleanup_expired_invitation_tokens();'
);

-- Weekly cleanup of old rate limits on Sundays at 3 AM UTC
SELECT cron.schedule(
    'cleanup-old-rate-limits',
    '0 3 * * 0',
    'SELECT cleanup_old_rate_limits();'
);

-- Monthly cleanup of old audit logs on the 1st at 4 AM UTC
SELECT cron.schedule(
    'cleanup-old-audit-logs',
    '0 4 1 * *',
    'SELECT cleanup_old_audit_logs();'
);

-- Monthly cleanup of old email metrics on the 1st at 5 AM UTC
SELECT cron.schedule(
    'cleanup-old-email-metrics',
    '0 5 1 * *',
    'SELECT cleanup_old_email_metrics();'
);

-- Create alerting function for high error rates
CREATE OR REPLACE FUNCTION check_email_system_alerts()
RETURNS VOID AS $$
DECLARE
    error_rate DECIMAL;
    failed_emails INTEGER;
    total_emails INTEGER;
    alert_threshold DECIMAL := 10.0; -- 10% error rate threshold
BEGIN
    -- Check error rate in the last hour
    SELECT 
        COUNT(*) FILTER (WHERE metric_type IN ('failed', 'bounced')),
        COUNT(*)
    INTO failed_emails, total_emails
    FROM email_metrics 
    WHERE created_at > NOW() - INTERVAL '1 hour';
    
    -- Calculate error rate
    IF total_emails > 0 THEN
        error_rate := (failed_emails::DECIMAL / total_emails) * 100;
        
        -- Log alert if error rate is too high
        IF error_rate > alert_threshold AND total_emails >= 10 THEN
            INSERT INTO audit_logs (
                action,
                resource_type,
                resource_id,
                success,
                error_message,
                metadata
            ) VALUES (
                'system_alert',
                'email_system',
                'error_rate_alert',
                false,
                'High email error rate detected',
                jsonb_build_object(
                    'error_rate', error_rate,
                    'failed_emails', failed_emails,
                    'total_emails', total_emails,
                    'threshold', alert_threshold,
                    'alert_type', 'high_error_rate'
                )
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule hourly alert checks
SELECT cron.schedule(
    'check-email-alerts',
    '0 * * * *',
    'SELECT check_email_system_alerts();'
);

-- Create function to check for stuck tokens (tokens that haven't been used after 24 hours)
CREATE OR REPLACE FUNCTION check_stuck_tokens()
RETURNS VOID AS $$
DECLARE
    stuck_count INTEGER;
BEGIN
    -- Count tokens created more than 24 hours ago but not used or expired
    SELECT COUNT(*)
    INTO stuck_count
    FROM invitation_tokens
    WHERE created_at < NOW() - INTERVAL '24 hours'
    AND used_at IS NULL
    AND expires_at > NOW();
    
    -- Log alert if there are stuck tokens
    IF stuck_count > 5 THEN
        INSERT INTO audit_logs (
            action,
            resource_type,
            resource_id,
            success,
            error_message,
            metadata
        ) VALUES (
            'system_alert',
            'token_system',
            'stuck_tokens_alert',
            false,
            'High number of unused tokens detected',
            jsonb_build_object(
                'stuck_count', stuck_count,
                'alert_type', 'stuck_tokens'
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily stuck token checks at 6 AM UTC
SELECT cron.schedule(
    'check-stuck-tokens',
    '0 6 * * *',
    'SELECT check_stuck_tokens();'
);

-- Create function to generate daily health report
CREATE OR REPLACE FUNCTION generate_daily_health_report()
RETURNS VOID AS $$
DECLARE
    health_data JSON;
BEGIN
    -- Get comprehensive health data
    SELECT get_email_system_health() INTO health_data;
    
    -- Log the daily health report
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        success,
        metadata
    ) VALUES (
        'daily_health_report',
        'email_system',
        'health_report',
        true,
        health_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily health reports at 8 AM UTC
SELECT cron.schedule(
    'daily-health-report',
    '0 8 * * *',
    'SELECT generate_daily_health_report();'
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_email_system_alerts() TO service_role;
GRANT EXECUTE ON FUNCTION check_stuck_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION generate_daily_health_report() TO service_role;

-- Display scheduled jobs
SELECT 
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname LIKE '%email%' OR jobname LIKE '%token%' OR jobname LIKE '%cleanup%' OR jobname LIKE '%health%'
ORDER BY jobname;