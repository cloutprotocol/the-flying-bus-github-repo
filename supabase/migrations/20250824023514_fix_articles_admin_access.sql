-- Fix articles RLS policy to allow admin access to all articles
DROP POLICY IF EXISTS "Public access to published articles" ON articles;
CREATE POLICY "Public access to published articles" ON articles
FOR SELECT USING (
  (status = 'published'::text) OR 
  (auth.uid() = author_id) OR 
  (auth.role() = 'service_role'::text) OR
  is_admin()
);
