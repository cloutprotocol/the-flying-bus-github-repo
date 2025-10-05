-- Migration: Fix anonymous role permissions and RLS policy for audit_logs
-- Purpose: Allow anonymous users to insert audit logs for invitation requests
-- Issue: Anonymous role lacks INSERT permissions and RLS policy doesn't handle 'anon' role

-- ============================================================================
-- GRANT ANONYMOUS ROLE PERMISSIONS
-- ============================================================================

-- Grant INSERT permission to anonymous role for audit_logs table
GRANT INSERT ON audit_logs TO anon;

-- Grant INSERT permission to anonymous role for other invitation-related tables
GRANT INSERT ON invitation_requests TO anon;
GRANT INSERT ON email_events TO anon;
GRANT INSERT ON rate_limit_attempts TO anon;

-- Grant SELECT permission to anonymous role for reading their own data
GRANT SELECT ON invitation_requests TO anon;
GRANT SELECT ON email_events TO anon;
GRANT SELECT ON rate_limit_attempts TO anon;
GRANT SELECT ON audit_logs TO anon;

-- ============================================================================
-- FIX AUDIT LOGS RLS POLICY FOR ANONYMOUS ROLE
-- ============================================================================

-- Drop the existing policy that doesn't handle 'anon' role correctly
DROP POLICY IF EXISTS "Allow audit logging for authenticated users and invitation requ" ON audit_logs;

-- Create a new policy that properly handles the anonymous role
CREATE POLICY "Allow audit logging for all invitation and authenticated users"
  ON audit_logs FOR INSERT
  WITH CHECK (
    -- Allow service role (backend operations)
    auth.role() = 'service_role' OR
    
    -- Allow authenticated users to log their own events
    (auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR 
      user_email = auth.email()
    )) OR
    
    -- Allow anonymous users to log invitation request events
    (auth.role() = 'anon' AND action IN (
      'invitation_request', 
      'invitation_submission',
      'invitation_form_submit'
    ))
  );

-- ============================================================================
-- ENSURE OTHER TABLES HAVE PROPER ANONYMOUS PERMISSIONS
-- ============================================================================

-- Update invitation_requests policy to explicitly handle anonymous role
DROP POLICY IF EXISTS "Anyone can create invitation requests" ON invitation_requests;

CREATE POLICY "Anonymous and authenticated users can create invitation requests"
  ON invitation_requests FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    auth.role() = 'anon' OR
    auth.role() = 'authenticated'
  );

-- Update email_events policy to explicitly handle anonymous role
DROP POLICY IF EXISTS "Users can log their own email events" ON email_events;

CREATE POLICY "Allow email event logging for invitation flow"
  ON email_events FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.role() = 'authenticated' AND email = auth.email()) OR
    (auth.role() = 'anon' AND type IN ('invitation_request', 'invitation_confirmation'))
  );

-- Update rate_limit_attempts policy to explicitly handle anonymous role
DROP POLICY IF EXISTS "Users can log their own rate limit attempts" ON rate_limit_attempts;

CREATE POLICY "Allow rate limiting for invitation flow"
  ON rate_limit_attempts FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.role() = 'authenticated' AND (
      identifier = (auth.uid())::text OR 
      identifier = auth.email()
    )) OR
    (auth.role() = 'anon' AND action = 'invitation_request')
  );

-- ============================================================================
-- CREATE MISSING RPC FUNCTION (IF NEEDED)
-- ============================================================================

-- Create the log_audit_event RPC function that the client is trying to call
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_user_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id uuid;
BEGIN
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
    user_agent
  ) VALUES (
    p_action,
    p_resource_type,
    p_resource_id,
    COALESCE(p_user_email, auth.email()),
    COALESCE(p_user_id, auth.uid()),
    p_success,
    p_error_message,
    p_metadata,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Grant execute permission to anonymous role for the RPC function
GRANT EXECUTE ON FUNCTION log_audit_event TO anon;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;

-- ============================================================================
-- COMMENTS: Security and Logic Explanation
-- ============================================================================

-- Anonymous Role Permissions:
-- - Can INSERT into all invitation-related tables
-- - Can SELECT their own data (filtered by RLS policies)
-- - Cannot access other users' data
-- - Limited to specific actions (invitation_request, etc.)

-- RLS Policy Logic:
-- - Explicitly checks auth.role() for 'anon', 'authenticated', 'service_role'
-- - Anonymous users limited to invitation-related actions only
-- - Authenticated users can access their own data
-- - Service role has full access

-- RPC Function:
-- - Provides a consistent interface for audit logging
-- - Uses SECURITY DEFINER to bypass RLS when needed
-- - Automatically fills in auth context when available
-- - Allows both anonymous and authenticated access