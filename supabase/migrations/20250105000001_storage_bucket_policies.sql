-- Storage Bucket RLS Policies Migration
-- This migration creates RLS policies for storage buckets
-- It's designed to be idempotent and safe for branch merging

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We cannot modify system tables via migrations, so we skip the ALTER TABLE command

-- Drop existing policies if they exist (idempotent approach)
DROP POLICY IF EXISTS "Media bucket public read access" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket authenticated upload access" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket owner delete access" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket owner update access" ON storage.objects;

-- Public read access for media bucket
-- Anyone can view/download files from the media bucket
CREATE POLICY "Media bucket public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Authenticated users can upload to media bucket
-- Only authenticated users can upload files
CREATE POLICY "Media bucket authenticated upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- Users can delete their own files
-- For profile pictures: users can delete files in their own avatars folder
-- For general media: users can delete files they uploaded
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
    -- Admin users can delete any file
    (
      auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      )
    )
  )
);

-- Users can update their own files (for metadata updates)
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
    -- Admin users can update any file
    (
      auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      )
    )
  )
);

-- Note: Storage buckets must be created via the setup script or Supabase Dashboard
-- Migrations cannot insert into storage.buckets (system table)
-- Run: npm run setup-storage:remote PROJECT_REF to create the bucket

-- Add helpful comment
COMMENT ON TABLE storage.objects IS 'Storage objects with RLS policies for media bucket access control';