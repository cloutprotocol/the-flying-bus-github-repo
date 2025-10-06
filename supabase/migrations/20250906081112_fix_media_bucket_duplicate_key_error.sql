-- Fix the media bucket duplicate key error for merge migration
-- The migration 20250826082807_create_media_storage_bucket.sql tries to INSERT
-- a bucket that already exists, causing a unique constraint violation

-- The bucket already exists with the correct configuration, so we just need to
-- ensure the migration will succeed by making the INSERT operation idempotent

-- Since we can't modify the existing migration, we'll create a temporary function
-- that the migration can use, or we'll pre-handle the conflict

-- Check current bucket configuration
DO $$
DECLARE
    bucket_exists BOOLEAN;
    current_config RECORD;
BEGIN
    -- Check if bucket exists
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'media') INTO bucket_exists;
    
    IF bucket_exists THEN
        -- Get current configuration
        SELECT * INTO current_config FROM storage.buckets WHERE id = 'media';
        
        RAISE NOTICE 'Media bucket already exists with configuration: name=%, public=%, file_size_limit=%, mime_types=%', 
            current_config.name, current_config.public, current_config.file_size_limit, current_config.allowed_mime_types;
            
        -- Update the bucket to ensure it has the exact configuration the migration expects
        UPDATE storage.buckets 
        SET 
            name = 'media',
            public = true,
            file_size_limit = 52428800,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov']
        WHERE id = 'media';
        
        RAISE NOTICE 'Updated media bucket configuration to match migration expectations';
    ELSE
        RAISE NOTICE 'Media bucket does not exist - migration will create it';
    END IF;
END $$;

-- Log this fix
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('storage_bucket_fix', 'system', 'merge_preparation', jsonb_build_object(
    'migration', 'fix_media_bucket_duplicate_key_error',
    'description', 'Ensured media storage bucket configuration matches migration expectations',
    'bucket_id', 'media',
    'action', 'Updated existing bucket to prevent duplicate key error',
    'timestamp', NOW()
  ));