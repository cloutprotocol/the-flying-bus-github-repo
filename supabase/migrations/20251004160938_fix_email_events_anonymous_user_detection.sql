-- Migration: Fix email_events anonymous user detection in RLS policies
-- Purpose: Fix RLS policy to properly detect anonymous users for invitation email logging
-- Issue: auth.role() returns NULL for anonymous users, not 'anon'
-- Requirements: 2.2, 3.3

-- ============================================================================
-- FIX ANONYMOUS USER DETECTION IN EMAIL_EVENTS RLS POLICIES
-- ============================================================================

-- Drop the existing policy that has incorrect anonymous user detection
DROP POLICY IF EXISTS "Allow invitation email event logging" ON email_events;

-- Create corrected policy with proper anonymous user detection
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
    -- Fix: Check for NULL auth.uid() instead of auth.role() = 'anon'
    (auth.uid() IS NULL AND type IN (
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
'Allows insertion of invitation-related email events. Fixed anonymous user detection: auth.uid() IS NULL instead of auth.role() = ''anon'' since auth.role() returns NULL for anonymous users in Supabase.';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Test anonymous user detection:
-- SET ROLE anon;
-- SELECT auth.role() as role, auth.uid() as uid, auth.uid() IS NULL as is_anonymous;
-- INSERT INTO email_events (type, email) VALUES ('invitation_request', 'test@example.com');