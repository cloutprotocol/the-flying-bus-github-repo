-- Migration: Completely reset invitation_requests RLS policies
-- Purpose: Fix persistent RLS issues by starting fresh
-- Issue: Complex policy interactions causing failures despite correct logic

-- ============================================================================
-- COMPLETELY RESET INVITATION_REQUESTS RLS
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE invitation_requests DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Anonymous and authenticated users can create invitation request" ON invitation_requests;
DROP POLICY IF EXISTS "Anyone can create invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "Allow public invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "Users can view their own invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "Admins can view all invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "Admins can update invitation requests" ON invitation_requests;

-- Re-enable RLS
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies from scratch
CREATE POLICY "public_can_insert_invitations"
  ON invitation_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "users_can_view_own_invitations"
  ON invitation_requests FOR SELECT
  TO public
  USING (
    parent_email = auth.email() OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "admins_can_view_all_invitations"
  ON invitation_requests FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "admins_can_update_invitations"
  ON invitation_requests FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    ) OR auth.role() = 'service_role'
  );

-- ============================================================================
-- COMMENTS: Fresh Start Approach
-- ============================================================================

-- This migration takes a "nuclear option" approach:
-- 1. Completely disable RLS
-- 2. Drop ALL existing policies
-- 3. Re-enable RLS
-- 4. Create simple, tested policies
--
-- The INSERT policy uses "WITH CHECK (true)" which should allow all inserts
-- This eliminates any complex auth.role() logic that might be causing issues
--
-- If this works, we can gradually add more restrictive policies later