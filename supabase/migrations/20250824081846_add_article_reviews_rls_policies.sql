-- Add RLS policies for article_reviews table

-- Allow admins and moderators to insert review records
CREATE POLICY "Admins and moderators can create reviews" ON article_reviews
FOR INSERT 
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Allow admins and moderators to view all reviews
CREATE POLICY "Admins and moderators can view all reviews" ON article_reviews
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Allow authors to view reviews of their own articles
CREATE POLICY "Authors can view reviews of their articles" ON article_reviews
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM articles 
    WHERE articles.id = article_reviews.article_id 
    AND articles.author_id = auth.uid()
  )
);

-- Allow admins and moderators to update reviews
CREATE POLICY "Admins and moderators can update reviews" ON article_reviews
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

-- Allow service role full access
CREATE POLICY "Service role can manage all reviews" ON article_reviews
FOR ALL 
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE article_reviews IS 'Article review records with RLS policies for admin/moderator access';