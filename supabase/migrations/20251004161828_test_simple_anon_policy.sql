-- Migration: Test simple anonymous policy for email_events
-- Purpose: Create a very simple policy to test if anonymous users can insert at all
-- This is a debugging migration to isolate the RLS issue

-- ============================================================================
-- CREATE SIMPLE TEST POLICY FOR ANONYMOUS USERS
-- ============================================================================

-- Drop all existing policies to test with a clean slate
DROP POLICY IF EXISTS "Allow invitation email event logging" ON email_events;
DROP POLICY IF EXISTS "Admin users can manage email events" ON email_events;
DROP POLICY IF EXISTS "Service role full access to email events" ON email_events;
DROP POLICY IF EXISTS "Users can view own email events" ON email_events;

-- Create a very simple policy that allows anon users to insert anything
CREATE POLICY "Test anon insert policy"
  ON email_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create service role policy for system operations
CREATE POLICY "Service role full access"
  ON email_events FOR ALL
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Test anon insert policy" ON email_events IS 
'Simple test policy to verify anonymous users can insert into email_events table';

COMMENT ON POLICY "Service role full access" ON email_events IS 
'Service role has full access for system operations';