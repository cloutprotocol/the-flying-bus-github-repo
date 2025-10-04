-- Migration: Fix email_events RLS policies for admin operations and system logging
-- Purpose: Allow admin operations and system logging for invitation-related email events
-- Issue: Admins cannot approve invitations due to RLS policy violations on email_events table
-- Requirements: 1.1, 2.1, 2.2

-- ============================================================================
-- DROP EXISTING RESTRICTIVE POLICIES
-- ============================================================================

-- Remove existing policies that are too restrictive
DROP POLICY IF EXISTS "Allow email event logging for invitation flow" ON email_events;
DROP POLICY IF EXISTS "Service role can manage email events" ON email_events;
DROP POLICY IF EXISTS "Users can view their own email events" ON email_events;

-- ============================================================================
-- CREATE COMPREHENSIVE RLS POLICIES FOR EMAIL_EVENTS
-- ============================================================================

-- Policy 1: Service role has full access (for system operations)
CREATE POLICY "Service role full access to email events"
  ON email_events FOR ALL
  USING (auth.role() = 'service_role');

-- Policy 2: Admin users can manage all email events (for admin operations)
CREATE POLICY "Admin users can manage email events"
  ON email_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Policy 3: Allow insertion for invitation-related email events (anonymous and authenticated)
CREATE POLICY "Allow invitation email event logging"
  ON email_events FOR INSERT
  WITH CHECK (
    -- Service role can insert anything
    auth.role() = 'service_role' OR
    -- Admin/moderator users can insert anything
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    ) OR
    -- Authenticated users can log events for their own email
    (auth.role() = 'authenticated' AND email = auth.email()) OR
    -- Anonymous users can log invitation-related events
    (auth.role() = 'anon' AND type IN (
      'invitation_request',
      'invitation_confirmation', 
      'invitation_approved',
      'invitation_denied',
      'trigger_delegated',
      'system_notification'
    ))
  );

-- Policy 4: Users can view their own email events
CREATE POLICY "Users can view own email events"
  ON email_events FOR SELECT
  USING (
    -- Service role can view all
    auth.role() = 'service_role' OR
    -- Admin/moderator users can view all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    ) OR
    -- Users can view their own events
    (auth.role() = 'authenticated' AND email = auth.email())
  );

-- ============================================================================
-- CREATE HELPER FUNCTION FOR ADMIN EMAIL EVENT LOGGING
-- ============================================================================

-- Function to allow admins to log email events with service role privileges
CREATE OR REPLACE FUNCTION log_admin_email_event(
  event_type text,
  event_email text,
  template_name text DEFAULT NULL,
  message_id_param text DEFAULT NULL,
  error_message text DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner (service role)
SET search_path = public
AS $$
DECLARE
  event_id uuid;
BEGIN
  -- Insert email event with service role privileges
  INSERT INTO email_events (
    type,
    email,
    template,
    message_id,
    error,
    metadata,
    timestamp
  ) VALUES (
    event_type,
    event_email,
    template_name,
    message_id_param,
    error_message,
    metadata_param,
    now()
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Grant execute permission to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION log_admin_email_event TO authenticated;

-- ============================================================================
-- CREATE HELPER FUNCTION FOR SYSTEM EMAIL EVENT LOGGING
-- ============================================================================

-- Function to allow system operations to log email events
CREATE OR REPLACE FUNCTION log_system_email_event(
  event_type text,
  event_email text,
  template_name text DEFAULT NULL,
  message_id_param text DEFAULT NULL,
  error_message text DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with service role privileges
SET search_path = public
AS $$
DECLARE
  event_id uuid;
BEGIN
  -- Insert email event with service role privileges
  INSERT INTO email_events (
    type,
    email,
    template,
    message_id,
    error,
    metadata,
    timestamp
  ) VALUES (
    event_type,
    event_email,
    template_name,
    message_id_param,
    error_message,
    metadata_param,
    now()
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Grant execute permission to all roles for system operations
GRANT EXECUTE ON FUNCTION log_system_email_event TO anon, authenticated, service_role;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

-- Add comments to explain the policy structure
COMMENT ON POLICY "Service role full access to email events" ON email_events IS 
'Allows service role full access for backend operations and system maintenance';

COMMENT ON POLICY "Admin users can manage email events" ON email_events IS 
'Allows admin and moderator users to manage all email events for administrative purposes';

COMMENT ON POLICY "Allow invitation email event logging" ON email_events IS 
'Allows insertion of invitation-related email events by service role, admins, authenticated users (own email), and anonymous users (invitation types only)';

COMMENT ON POLICY "Users can view own email events" ON email_events IS 
'Allows users to view their own email events, with full access for service role and admins';

COMMENT ON FUNCTION log_admin_email_event IS 
'Helper function for admin users to log email events with elevated privileges, bypassing RLS restrictions';

COMMENT ON FUNCTION log_system_email_event IS 
'Helper function for system operations to log email events with elevated privileges, available to all roles';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- These queries can be used to verify the policies work correctly:
-- 
-- Test admin access (run as admin user):
-- SELECT * FROM email_events;
-- 
-- Test user access (run as regular user):
-- SELECT * FROM email_events WHERE email = auth.email();
-- 
-- Test anonymous insertion (run as anonymous):
-- INSERT INTO email_events (type, email) VALUES ('invitation_request', 'test@example.com');
-- 
-- Test admin helper function:
-- SELECT log_admin_email_event('invitation_approved', 'parent@example.com', 'invitation_template');
-- 
-- Test system helper function:
-- SELECT log_system_email_event('system_notification', 'user@example.com', 'system_template');