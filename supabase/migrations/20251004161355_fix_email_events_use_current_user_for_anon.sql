-- Migration: Fix email_events RLS policy to use current_user for anonymous detection
-- Purpose: Use current_user = 'anon' instead of auth.uid() IS NULL for more reliable anonymous user detection
-- Issue: auth.uid() IS NULL check was not working properly for anonymous users
-- Requirements: 2.2, 3.3

-- ============================================================================
-- FIX ANONYMOUS USER DETECTION USING CURRENT_USER
-- ============================================================================

-- Drop the existing policy that uses auth.uid() IS NULL
DROP POLICY IF EXISTS "Allow invitation email event logging" ON email_events;

-- Create corrected policy with current_user = 'anon' for anonymous detection
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
    -- Fix: Use current_user = 'anon' for reliable anonymous user detection
    (current_user = 'anon' AND type IN (
      'invitation_request',
      'invitation_confirmation', 
      'invitation_approved',
      'invitation_denied',
      'trigger_delegated',
      'system_notification'
    ))
  );

-- ============================================================================
-- ADD COMMENT TO EXPLAIN THE FIX
-- ============================================================================

COMMENT ON POLICY "Allow invitation email event logging" ON email_events IS 
'Allows insertion of invitation-related email events. Uses current_user = ''anon'' for reliable anonymous user detection in Supabase RLS policies.';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Test anonymous user detection:
-- SET ROLE anon;
-- SELECT current_user = 'anon' as is_anon, auth.uid() IS NULL as uid_null;
-- INSERT INTO email_events (type, email) VALUES ('invitation_request', 'test@example.com');