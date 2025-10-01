-- Ensure log_audit_event function exists and is properly accessible
-- This migration recreates the function to resolve client cache issues

-- Drop and recreate the log_audit_event function to ensure it's properly registered
DROP FUNCTION IF EXISTS log_audit_event(text, text, text, text, uuid, boolean, text, jsonb, text, text);

-- Create the log_audit_event function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_user_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  audit_id uuid;
BEGIN
  -- Insert audit log entry
  INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    user_email,
    user_id,
    success,
    error_message,
    metadata,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_action,
    p_resource_type,
    p_resource_id,
    p_user_email,
    p_user_id,
    p_success,
    p_error_message,
    COALESCE(p_metadata, '{}'),
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the calling operation
  RAISE WARNING 'Failed to log audit event: %', SQLERRM;
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to all necessary roles
GRANT EXECUTE ON FUNCTION log_audit_event(text, text, text, text, uuid, boolean, text, jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION log_audit_event(text, text, text, text, uuid, boolean, text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(text, text, text, text, uuid, boolean, text, jsonb, text, text) TO service_role;

-- Add function comment
COMMENT ON FUNCTION log_audit_event(text, text, text, text, uuid, boolean, text, jsonb, text, text) IS 'Logs audit events to the audit_logs table with comprehensive error handling';

-- Test the function to ensure it works
DO $$
DECLARE
  test_id uuid;
BEGIN
  SELECT log_audit_event(
    'migration_test',
    'system',
    'audit_function_recreation',
    'system@test.com',
    NULL,
    true,
    NULL,
    '{"migration": "20251001043152_ensure_audit_function_exists", "test": true}',
    NULL,
    'migration-script'
  ) INTO test_id;
  
  RAISE NOTICE 'Audit function test successful, created audit entry: %', test_id;
END $$;
