-- Add UPDATE policy for admins and moderators to update any article
CREATE POLICY "Admins and moderators can update all articles" ON articles
FOR UPDATE 
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Admins and moderators can update all articles" ON articles IS 'Allows admins and moderators to update any article for review and moderation purposes';
