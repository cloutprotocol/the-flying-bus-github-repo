-- Migration: Fix audit_logs RLS policy for unauthenticated invitation requests
-- Purpose: Allow unauthenticated users to log audit events for invitation requests
-- Issue: Current policy requires authentication context, but invitation requests are public

-- ============================================================================
-- DROP AND RECREATE AUDIT LOGS INSERT POLICY
-- ============================================================================

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can log their own audit events" ON audit_logs;

-- Create a new policy that properly handles unauthenticated invitation requests
CREATE POLICY "Allow audit logging for authenticated users and invitation requests"
  ON audit_logs FOR INSERT
  WITH CHECK (
    -- Allow service role (backend operations)
    auth.role() = 'service_role' OR
    
    -- Allow authenticated users to log their own events
    (auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR 
      user_email = auth.email()
    )) OR
    
    -- Allow unauthenticated users to log invitation request events
    (auth.uid() IS NULL AND action IN (
      'invitation_request', 
      'invitation_submission',
      'invitation_form_submit'
    ))
  );

-- ============================================================================
-- COMMENTS: Policy Logic Explanation
-- ============================================================================

-- This policy handles three scenarios:
-- 1. Service role: Full access for backend operations
-- 2. Authenticated users: Can log events for their own user_id/email
-- 3. Unauthenticated users: Can ONLY log invitation-related events
--
-- The key fix: Explicitly check for auth.uid() IS NULL to handle
-- unauthenticated users, rather than relying on OR conditions that
-- fail when all authentication contexts are null.
--
-- Security: Unauthenticated users can only log specific invitation
-- actions, preventing abuse while enabling the invitation flow.