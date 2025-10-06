-- Comprehensive Email Event Logging and Monitoring Enhancement
-- This migration enhances the existing email logging system with comprehensive monitoring functions

-- First, let's enhance the email_events table structure if needed
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_events_type_timestamp ON email_events(type, timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_email_timestamp ON email_events(email, timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_template_timestamp ON email_events(template, timestamp);

-- Add indexes to audit_logs for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_created_at ON audit_logs(resource_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success_created_at ON audit_logs(success, created_at);

-- Enhanced logging function for database triggers
CREATE OR REPLACE FUNCTION log_trigger_email_event(
  p_event_type text,
  p_email text,
  p_template text,
  p_method text,
  p_success boolean,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO email_events (
    type,
    email,
    template,
    message_id,
    error,
    metadata
  ) VALUES (
    p_event_type,
    p_email,
    p_template,
    CASE WHEN p_success THEN 'trigger_' || gen_random_uuid()::text ELSE NULL END,
    p_error_message,
    p_metadata || jsonb_build_object(
      'method', p_method,
      'success', p_success,
      'logged_at', NOW(),
      'source', 'database_trigger'
    )
  ) RETURNING id INTO v_event_id;
  
  -- Also log to audit_logs for failed operations
  IF NOT p_success THEN
    INSERT INTO audit_logs (
      action,
      resource_type,
      resource_id,
      user_email,
      success,
      error_message,
      metadata
    ) VALUES (
      'email_send_failed',
      'email_event',
      v_event_id::text,
      p_email,
      false,
      p_error_message,
      p_metadata || jsonb_build_object(
        'event_type', p_event_type,
        'template', p_template,
        'method', p_method
      )
    );
  END IF;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
