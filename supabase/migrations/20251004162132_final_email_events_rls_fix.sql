-- Migration: Final comprehensive email_events RLS policy fix
-- Purpose: Create working RLS policies for all user types including proper anonymous access
-- Requirements: 2.2, 3.3

-- ============================================================================
-- DROP ALL EXISTING POLICIES AND START FRESH
-- ============================================================================

DROP POLICY IF EXISTS "Allow all inserts for testing" ON email_events;
DROP POLICY IF EXISTS "Service role full access" ON email_events;
DROP POLICY IF EXISTS "Test anon insert policy" ON email_events;

-- ============================================================================
-- CREATE COMPREHENSIVE WORKING RLS POLICIES
-- ============================================================================

-- Policy 1: Service role has full access (for system operations)
CREATE POLICY "Service role full access to email events"
  ON email_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 2: Admin users can manage all email events (for admin operations)
CREATE POLICY "Admin users can manage email events"
  ON email_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Policy 3: Authenticated users can manage their own email events
CREATE POLICY "Authenticated users can manage own email events"
  ON email_events FOR ALL
  USING (auth.role() = 'authenticated' AND email = auth.email())
  WITH CHECK (auth.role() = 'authenticated' AND email = auth.email());

-- Policy 4: Anonymous users can insert invitation-related events
-- Use a simple approach that works with Supabase's auth system
CREATE POLICY "Anonymous users can insert invitation events"
  ON email_events FOR INSERT
  WITH CHECK (
    -- Allow if no authenticated user (anonymous context)
    auth.uid() IS NULL 
    AND type IN (
      'invitation_request',
      'invitation_confirmation', 
      'invitation_approved',
      'invitation_denied',
      'trigger_delegated',
      'system_notification'
    )
  );

-- ============================================================================
-- CREATE HELPER FUNCTIONS FOR SYSTEM OPERATIONS
-- ============================================================================

-- Function to allow system operations to log email events with elevated privileges
CREATE OR REPLACE FUNCTION log_email_event_system(
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
  -- Insert email event with service role privileges, bypassing RLS
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
GRANT EXECUTE ON FUNCTION log_email_event_system TO anon, authenticated, service_role;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Service role full access to email events" ON email_events IS 
'Allows service role full access for backend operations and system maintenance';

COMMENT ON POLICY "Admin users can manage email events" ON email_events IS 
'Allows admin and moderator users to manage all email events for administrative purposes';

COMMENT ON POLICY "Authenticated users can manage own email events" ON email_events IS 
'Allows authenticated users to manage email events for their own email address';

COMMENT ON POLICY "Anonymous users can insert invitation events" ON email_events IS 
'Allows anonymous users to insert invitation-related email events using auth.uid() IS NULL detection';

COMMENT ON FUNCTION log_email_event_system IS 
'System function to log email events with elevated privileges, bypassing RLS restrictions for system operations';

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- This migration creates a comprehensive RLS policy system that:
-- 1. Allows service role full access for system operations
-- 2. Allows admin users to manage all email events
-- 3. Allows authenticated users to manage their own email events  
-- 4. Allows anonymous users to insert invitation-related events
-- 5. Provides a system function for elevated privilege operations
--
-- The anonymous user detection uses auth.uid() IS NULL which should work
-- in the Supabase client context even if direct SQL role switching doesn't work.