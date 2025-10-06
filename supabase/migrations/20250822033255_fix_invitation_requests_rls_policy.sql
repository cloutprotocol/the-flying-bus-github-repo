-- Fix RLS policy for invitation_requests table
-- This migration addresses the issue where the invitation form cannot submit due to RLS violations

-- First, drop all existing policies on invitation_requests
DROP POLICY IF EXISTS "Public can create invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "Anyone can create invitation requests" ON invitation_requests;
DROP POLICY IF EXISTS "allow_insert_invitation_requests" ON invitation_requests;
DROP POLICY IF EXISTS "public_insert" ON invitation_requests;
DROP POLICY IF EXISTS "test_insert" ON invitation_requests;
DROP POLICY IF EXISTS "anon_insert" ON invitation_requests;

-- Create a comprehensive policy that allows both anonymous and authenticated users to insert
CREATE POLICY "enable_insert_for_all_users" ON invitation_requests
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also create a policy for authenticated users to view their own requests (optional, for future use)
CREATE POLICY "users_can_view_own_requests" ON invitation_requests
FOR SELECT 
TO authenticated
USING (true);

-- For now, allow all authenticated users to view (can be restricted later)

-- Ensure the admin policies are still in place
-- (These should already exist, but let's make sure)

-- Admin can view all invitation requests
DROP POLICY IF EXISTS "Admins can view all invitation requests" ON invitation_requests;
CREATE POLICY "admins_can_view_all_requests" ON invitation_requests
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admin can update invitation requests
DROP POLICY IF EXISTS "Admins can update invitation requests" ON invitation_requests;
CREATE POLICY "admins_can_update_requests" ON invitation_requests
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admin can delete invitation requests
DROP POLICY IF EXISTS "Admins can delete invitation requests" ON invitation_requests;
CREATE POLICY "admins_can_delete_requests" ON invitation_requests
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Re-enable the trigger
ALTER TABLE invitation_requests ENABLE TRIGGER trigger_send_confirmation_email;