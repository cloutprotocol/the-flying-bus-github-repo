-- Migration: Fix email_events RLS policy to allow trigger_delegated type
-- Purpose: Allow database triggers to insert email_events with type 'trigger_delegated'
-- Issue: Trigger uses 'trigger_delegated' but policy only allows 'invitation_request' and 'invitation_confirmation'

-- ============================================================================
-- UPDATE EMAIL EVENTS RLS POLICY TO INCLUDE TRIGGER_DELEGATED
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow email event logging for invitation flow" ON email_events;

-- Create updated policy that includes 'trigger_delegated' type
CREATE POLICY "Allow email event logging for invitation flow"
  ON email_events FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.role() = 'authenticated' AND email = auth.email()) OR
    (auth.role() = 'anon' AND type IN (
      'invitation_request', 
      'invitation_confirmation',
      'trigger_delegated'  -- Add this to allow database triggers
    ))
  );

-- ============================================================================
-- COMMENTS: Policy Logic Explanation
-- ============================================================================

-- This policy now allows:
-- 1. Service role: Full access for backend operations
-- 2. Authenticated users: Can log events for their own email
-- 3. Anonymous users: Can log specific invitation-related events INCLUDING trigger_delegated
--
-- The 'trigger_delegated' type is used by database triggers when they need to
-- log email events on behalf of anonymous users during invitation creation.
--
-- Security: Anonymous users are still limited to specific email event types
-- related to the invitation flow, preventing abuse while enabling triggers.