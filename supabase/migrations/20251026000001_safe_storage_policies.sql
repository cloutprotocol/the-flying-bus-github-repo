-- Safe storage policies that don't assume profiles table already exists.
-- This version checks for the table first.

DO $$
BEGIN
  -- DELETE policy
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Media bucket owner delete access'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "Media bucket owner delete access"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'media'
        AND (
          -- Users can delete their own avatar files
          (name LIKE 'avatars/' || auth.uid()::text || '/%')
          OR
          -- Users can delete files they uploaded (if owner field is set)
          (owner = auth.uid())
          OR
          -- Admin users can delete any file, but only if profiles exists
          (
            EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_name = 'profiles'
              AND table_schema = 'public'
            )
            AND auth.uid() IN (
              SELECT id FROM profiles WHERE role = 'admin'
            )
          )
        )
      );
    $POLICY$;
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Media bucket owner update access'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "Media bucket owner update access"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'media'
        AND (
          (name LIKE 'avatars/' || auth.uid()::text || '/%')
          OR
          (owner = auth.uid())
          OR
          (
            EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_name = 'profiles'
              AND table_schema = 'public'
            )
            AND auth.uid() IN (
              SELECT id FROM profiles WHERE role = 'admin'
            )
          )
        )
      );
    $POLICY$;
  END IF;
END $$;
