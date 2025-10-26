-- Safe storage policies that don't assume profiles table already exists.
-- This version checks for the table first.

DO $$
BEGIN
  -- Only create the policy if 'profiles' table exists to avoid preview DB failure
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  ) THEN

    CREATE POLICY "Media bucket owner delete access"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'media'
      AND (
        -- User can delete their own avatar files
        (name LIKE 'avatars/' || auth.uid()::text || '/%')
        OR
        -- User can delete files they uploaded
        (owner = auth.uid())
        OR
        -- Admin users can delete any file
        (
          auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
          )
        )
      )
    );

  ELSE
    RAISE NOTICE 'Skipping policy creation: profiles table not found.';
  END IF;
END $$;