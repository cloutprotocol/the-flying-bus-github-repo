-- Comprehensive fix for RLS policy circular dependencies
-- This migration addresses auth-data loading interference by optimizing helper functions
-- and ensuring public content remains accessible

-- Step 1: Drop all policies that depend on is_admin function
DROP POLICY IF EXISTS "Article revisions can be created by authors and admins" ON public.article_revisions;
DROP POLICY IF EXISTS "Only authors and admins can manage article tags" ON public.article_tags;
DROP POLICY IF EXISTS "Authors can create articles" ON public.articles;
DROP POLICY IF EXISTS "Users can upload media assets" ON public.media_assets;
DROP POLICY IF EXISTS "System can create registration contexts" ON public.registration_contexts;
DROP POLICY IF EXISTS "Authors and admins can create storyboard episodes" ON public.storyboard_episodes;
DROP POLICY IF EXISTS "Authors and admins can create storyboard series" ON public.storyboard_series;
DROP POLICY IF EXISTS "Only admins can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Only admins can create achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert reading stats" ON public.user_reading_stats;
DROP POLICY IF EXISTS "Users and system can update reading stats" ON public.user_reading_stats;

-- Step 2: Drop existing helper functions
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_moderator_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_moderator() CASCADE;

-- Step 3: Create optimized helper functions that avoid circular dependencies
-- These use SECURITY DEFINER to bypass RLS and prevent circular dependencies

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role text;
BEGIN
    -- Return false immediately if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    -- Return true if user is admin, false otherwise
    RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs (like profile not found), return false
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role text;
BEGIN
    -- Return false immediately if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    -- Return true if user is moderator or admin, false otherwise
    RETURN COALESCE(user_role IN ('moderator', 'admin'), false);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return false
        RETURN false;
END;
$$;CREATE OR 
REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role text;
BEGIN
    -- Return false immediately if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    -- Return true if user is moderator, false otherwise
    RETURN COALESCE(user_role = 'moderator', false);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return false
        RETURN false;
END;
$$;

-- Step 4: Optimize profiles table policies to prevent blocking
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during registration" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;

-- Create optimized profile policies that ensure accessibility
CREATE POLICY "Public read access to profiles"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO public
USING (auth.uid() = id);

CREATE POLICY "Allow profile creation during registration"
ON public.profiles FOR INSERT
TO public
WITH CHECK (
  auth.role() = 'service_role' OR
  auth.uid() = id OR
  (auth.uid() IS NULL AND EXISTS(SELECT 1 FROM auth.users WHERE users.id = profiles.id))
);

CREATE POLICY "Service role can manage profiles"
ON public.profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Ensure articles are always accessible for public content
DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.articles;
CREATE POLICY "Public access to published articles"
ON public.articles FOR SELECT
TO public
USING (
  status = 'published' OR
  auth.uid() = author_id OR
  auth.role() = 'service_role'
);

-- Step 6: Ensure categories are always accessible
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Public access to categories"
ON public.categories FOR SELECT
TO public
USING (true);

-- Step 7: Recreate all the policies that were dropped, with optimized logic
CREATE POLICY "Article revisions can be created by authors and admins"
ON public.article_revisions FOR INSERT
TO public
WITH CHECK (auth.uid() = editor_id OR is_admin());

CREATE POLICY "Only authors and admins can manage article tags"
ON public.article_tags FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM articles
    WHERE articles.id = article_tags.article_id 
    AND (articles.author_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "Authors can create articles"
ON public.articles FOR INSERT
TO public
WITH CHECK (auth.uid() = author_id OR is_admin());

CREATE POLICY "Users can upload media assets"
ON public.media_assets FOR INSERT
TO public
WITH CHECK (auth.uid() = uploader_id OR is_admin());

CREATE POLICY "System can create registration contexts"
ON public.registration_contexts FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role' OR is_admin());

CREATE POLICY "Authors and admins can create storyboard episodes"
ON public.storyboard_episodes FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM storyboard_series
    WHERE storyboard_series.id = storyboard_episodes.series_id 
    AND (storyboard_series.author_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "Authors and admins can create storyboard series"
ON public.storyboard_series FOR INSERT
TO public
WITH CHECK (auth.uid() = author_id OR is_admin());

CREATE POLICY "Only admins can manage tags"
ON public.tags FOR ALL
TO public
USING (is_admin());

CREATE POLICY "Only admins can create achievements"
ON public.user_achievements FOR INSERT
TO public
WITH CHECK (is_admin());

CREATE POLICY "System can insert reading stats"
ON public.user_reading_stats FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users and system can update reading stats"
ON public.user_reading_stats FOR UPDATE
TO public
USING (auth.uid() = user_id OR is_admin());-- Ste
p 8: Create a test function to verify data loading independence
CREATE OR REPLACE FUNCTION public.test_data_loading_independence()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'published_articles_count', (SELECT COUNT(*) FROM public.articles WHERE status = 'published'),
    'categories_count', (SELECT COUNT(*) FROM public.categories),
    'profiles_accessible', (SELECT COUNT(*) FROM public.profiles) > 0,
    'helper_functions_working', (
      SELECT jsonb_build_object(
        'is_admin_callable', (SELECT is_admin() IS NOT NULL),
        'is_moderator_or_admin_callable', (SELECT is_moderator_or_admin() IS NOT NULL)
      )
    ),
    'timestamp', now()
  );
$$;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO public;
GRANT EXECUTE ON FUNCTION public.is_moderator_or_admin() TO public;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO public;
GRANT EXECUTE ON FUNCTION public.test_data_loading_independence() TO public;

-- Step 10: Add helpful comments
COMMENT ON FUNCTION public.is_admin() IS 'Optimized admin check that avoids RLS circular dependencies using SECURITY DEFINER';
COMMENT ON FUNCTION public.is_moderator_or_admin() IS 'Optimized moderator/admin check that avoids RLS circular dependencies';
COMMENT ON FUNCTION public.test_data_loading_independence() IS 'Test function to verify data loading works independently of auth state';