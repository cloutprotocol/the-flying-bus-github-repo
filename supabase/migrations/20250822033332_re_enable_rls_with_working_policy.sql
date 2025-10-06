-- Re-enable RLS with a working policy for invitation_requests
-- This provides security while allowing the form to work

-- Re-enable RLS
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;

-- Create a simple, working policy for inserts
-- The key insight is to use a very simple policy that doesn't reference other tables
CREATE POLICY "allow_public_insert_invitation_requests" ON invitation_requests
FOR INSERT 
WITH CHECK (
  -- Allow insert if all required fields are provided and valid
  parent_name IS NOT NULL AND 
  parent_name != '' AND
  parent_email IS NOT NULL AND 
  parent_email != '' AND
  child_name IS NOT NULL AND 
  child_name != '' AND
  child_age >= 8 AND 
  child_age <= 14
);

-- Create policies for admin access
CREATE POLICY "allow_admin_select_invitation_requests" ON invitation_requests
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "allow_admin_update_invitation_requests" ON invitation_requests
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "allow_admin_delete_invitation_requests" ON invitation_requests
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Update the table comment
COMMENT ON TABLE invitation_requests IS 'RLS re-enabled with working policies. Public can insert, admins can manage.';