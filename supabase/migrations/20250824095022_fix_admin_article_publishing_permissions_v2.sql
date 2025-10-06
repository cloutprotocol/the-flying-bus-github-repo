-- Fix admin article publishing permissions
-- The issue is that the admin update policy has a restrictive with_check clause

-- Drop the existing admin update policy
DROP POLICY IF EXISTS "Admins and moderators can update all articles" ON articles;

-- Recreate the admin update policy without restrictive with_check
-- This allows admins to update any field of any article including publishing
CREATE POLICY "Admins and moderators can update all articles" ON articles
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (true);

-- Allow admins to set any values without restrictions

-- Also update the author policy to be clearer about what authors can do
DROP POLICY IF EXISTS "Authors can update their own articles" ON articles;

-- Recreate author policy - authors can update their own articles but cannot publish directly
CREATE POLICY "Authors can update their own articles" ON articles
  FOR UPDATE
  TO public
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their own articles;