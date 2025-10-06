-- Add policy for admins and moderators to view all articles for review purposes
CREATE POLICY "Admins and moderators can view all articles for review" ON articles
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Admins and moderators can view all articles for review" ON articles IS 'Allows admins and moderators to view all articles regardless of status for review purposes';
