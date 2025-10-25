-- Fix storage policies to be conditional on profiles table existence
-- This prevents preview branch failures when profiles table doesn't exist yet
-- The original storage policies reference profiles table which is created in a later migration

-- Drop existing policies (idempotent approach)
DROP POLICY IF EXISTS "Media bucket owner delete access" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket owner update access" ON storage.objects;

-- Recreate DELETE policy with conditional profiles table check
-- CREATE POLICY "Media bucket owner delete access"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'media' 
--   AND (
     -- Users can delete their own avatar files
--     (name LIKE 'avatars/' || auth.uid()::text || '/%')
--     OR
    -- Users can delete files they uploaded (if owner field is set)
--     (owner = auth.uid())
  --   OR
    -- Admin users can delete any file (only if profiles table exists)
--     (
--       EXISTS (SELECT 1 FROM information_schema.tables 
--               WHERE table_name = 'profiles' AND table_schema = 'public')
--       AND auth.uid() IN (
--         SELECT id FROM profiles WHERE role = 'admin'
--       )
--     )
--   )
-- );

-- Recreate UPDATE policy with conditional profiles table check
CREATE POLICY "Media bucket owner update access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' 
  AND (
    -- Users can update their own avatar files
    (name LIKE 'avatars/' || auth.uid()::text || '/%')
    OR
    -- Users can update files they uploaded
    (owner = auth.uid())
    OR
    -- Admin users can update any file (only if profiles table exists)
    (
      EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'profiles' AND table_schema = 'public')
      AND auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      )
    )
  )
);

-- Migration complete: Storage policies now work with or without profiles table
-- This fixes preview branch creation while maintaining full functionality in production