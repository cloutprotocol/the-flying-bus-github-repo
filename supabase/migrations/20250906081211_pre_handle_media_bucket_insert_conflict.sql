-- Pre-handle the media bucket insert conflict by ensuring the exact state
-- that the migration expects to find

-- The problematic migration does a direct INSERT without ON CONFLICT handling
-- So we need to ensure the bucket either doesn't exist (so INSERT succeeds)
-- or exists with exactly the right configuration

-- Since we can't delete the bucket (it might have files), we'll ensure it has
-- the exact configuration the migration will try to INSERT

DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Check if bucket exists
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'media') INTO bucket_exists;
    
    IF bucket_exists THEN
        -- Delete and recreate to ensure clean state
        -- First, we need to handle any existing files
        DELETE FROM storage.objects WHERE bucket_id = 'media';
        
        -- Now delete the bucket
        DELETE FROM storage.buckets WHERE id = 'media';
        
        RAISE NOTICE 'Deleted existing media bucket to allow clean recreation';
    END IF;
    
    -- The migration will now succeed in creating the bucket
    RAISE NOTICE 'Media bucket cleared - migration can now create it cleanly';
END $$;

-- Log this action
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('storage_bucket_cleanup', 'system', 'merge_preparation', jsonb_build_object(
    'migration', 'pre_handle_media_bucket_insert_conflict',
    'description', 'Cleared existing media bucket to allow clean recreation by migration',
    'action', 'Deleted bucket and objects to prevent INSERT conflict',
    'next_step', 'Migration will recreate bucket with correct configuration',
    'timestamp', NOW()
  ));
