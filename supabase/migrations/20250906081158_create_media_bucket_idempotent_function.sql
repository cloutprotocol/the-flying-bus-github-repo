-- Create a function to handle media bucket creation idempotently
-- This will be called by the failing migration to avoid duplicate key errors

CREATE OR REPLACE FUNCTION create_media_bucket_if_not_exists()
RETURNS VOID AS $$
BEGIN
    -- Try to insert the bucket, ignore if it already exists
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
    VALUES (
        'media',
        'media', 
        true,
        52428800, -- 50MB limit
        ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov']
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Update existing bucket to ensure it has the correct configuration
    UPDATE storage.buckets 
    SET 
        name = 'media',
        public = true,
        file_size_limit = 52428800,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov']
    WHERE id = 'media';
    
    RAISE NOTICE 'Media bucket created or updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_media_bucket_if_not_exists() TO service_role;

-- Test the function
SELECT create_media_bucket_if_not_exists();

-- Log this function creation
INSERT INTO email_events (type, email, template, metadata) VALUES 
  ('storage_bucket_function', 'system', 'merge_preparation', jsonb_build_object(
    'migration', 'create_media_bucket_idempotent_function',
    'description', 'Created function to handle media bucket creation idempotently',
    'function_name', 'create_media_bucket_if_not_exists',
    'purpose', 'Avoid duplicate key errors during migration',
    'timestamp', NOW()
  ));