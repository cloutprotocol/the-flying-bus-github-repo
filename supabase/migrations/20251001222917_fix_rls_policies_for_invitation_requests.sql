-- Migration: Fix RLS policies for invitation request flow
-- Purpose: Allow client-side operations for invitation requests, email events, audit logs, and rate limiting
-- Issue: Current policies only allow service_role, blocking legitimate client operations

-- ============================================================================
-- INVITATION REQUESTS TABLE - Add missing RLS policies
-- ============================================================================

-- Enable RLS on invitation_requests table
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create invitation requests (public form submission)
CREATE POLICY "Anyone can create invitation requests"
  ON invitation_requests FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own invitation requests
CREATE POLICY "Users can view their own invitation requests"
  ON invitation_requests FOR SELECT
  USING (parent_email = auth.email() OR auth.role() = 'service_role');

-- Allow admins and service role to view all invitation requests
CREATE POLICY "Admins can view all invitation requests"
  ON invitation_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    ) OR auth.role() = 'service_role'
  );

-- Allow admins and service role to update invitation requests (for approval/rejection)
CREATE POLICY "Admins can update invitation requests"
  ON invitation_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    ) OR auth.role() = 'service_role'
  );

-- ============================================================================
-- EMAIL EVENTS TABLE - Allow client-side logging for invitation flow
-- ============================================================================

-- Allow authenticated users to insert email events for their own email
CREATE POLICY "Users can log their own email events"
  ON email_events FOR INSERT
  WITH CHECK (
    email = auth.email() OR 
    auth.role() = 'service_role' OR
    -- Allow insertion for invitation request emails (before user is authenticated)
    type IN ('invitation_request', 'invitation_confirmation')
  );

-- ============================================================================
-- AUDIT LOGS TABLE - Allow client-side audit logging
-- ============================================================================

-- Allow authenticated users to insert audit logs for their own actions
CREATE POLICY "Users can log their own audit events"
  ON audit_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR 
    user_email = auth.email() OR 
    auth.role() = 'service_role' OR
    -- Allow audit logging for invitation requests (before user is authenticated)
    action IN ('invitation_request', 'invitation_submission')
  );

-- ============================================================================
-- RATE LIMIT ATTEMPTS TABLE - Allow client-side rate limiting
-- ============================================================================

-- Allow users to insert rate limit attempts for their own identifier
CREATE POLICY "Users can log their own rate limit attempts"
  ON rate_limit_attempts FOR INSERT
  WITH CHECK (
    identifier = (auth.uid())::text OR 
    identifier = auth.email() OR 
    auth.role() = 'service_role' OR
    -- Allow rate limiting for invitation requests (using email as identifier)
    action = 'invitation_request'
  );

-- ============================================================================
-- COMMENTS: Policy Rationale
-- ============================================================================

-- These policies are designed to:
-- 1. Allow public invitation request submissions (essential for onboarding)
-- 2. Enable proper client-side logging and audit trails
-- 3. Maintain security by restricting access to own data
-- 4. Preserve admin/service role privileges
-- 5. Support the invitation flow before users are fully authenticated

-- Security considerations:
-- - Public can only INSERT invitation requests, not read others'
-- - Email events are restricted to own email or invitation types
-- - Audit logs are restricted to own actions or invitation actions
-- - Rate limiting works for own identifier or invitation requests
-- - All policies maintain service_role override for backend operations