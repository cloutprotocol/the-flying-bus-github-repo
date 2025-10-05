-- Migration: Fix email_events RLS policies for database triggers
-- Purpose: Allow database triggers to insert email events
-- Issue: Triggers run in service role context, not anonymous context

-- Drop the problematic anonymous policy
DROP POLICY IF EXISTS "Anonymous users can insert invitation events" ON email_events;

-- Create a more comprehensive policy that works for both anonymous users AND triggers
CREATE POLICY "Allow invitation event inserts"
  ON email_events FOR INSERT
  WITH CHECK (
    -- Allow service role (for triggers and system operations)
    auth.role() = 'service_role'
    OR
    -- Allow anonymous users for invitation-related events
    (
      auth.uid() IS NULL 
      AND type IN (
        'invitation_request',
        'invitation_confirmation', 
        'invitation_approved',
        'invitation_denied',
        'trigger_delegated',
        'system_notification'
      )
    )
    OR
    -- Allow authenticated users for their own email events
    (
      auth.role() = 'authenticated' 
      AND email = auth.email()
    )
  );

-- Also ensure audit_logs allows anonymous inserts for invitation requests
DROP POLICY IF EXISTS "Allow audit logging for all invitation and authenticated users" ON audit_logs;

CREATE POLICY "Allow audit logging for invitations and system operations"
  ON audit_logs FOR INSERT
  WITH CHECK (
    -- Allow service role (for system operations)
    auth.role() = 'service_role'
    OR
    -- Allow anonymous users for invitation-related audit logs
    (
      auth.uid() IS NULL 
      AND resource_type IN ('invitation_request', 'invitation', 'email_event')
    )
    OR
    -- Allow authenticated users for their own audit logs
    (
      auth.role() = 'authenticated' 
      AND (user_id = auth.uid() OR user_email = auth.email())
    )
  );

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed email_events and audit_logs RLS policies for database triggers';
  RAISE NOTICE 'Database triggers can now log email events with service_role context';
  RAISE NOTICE 'Anonymous users can still submit invitation forms';
END $$;