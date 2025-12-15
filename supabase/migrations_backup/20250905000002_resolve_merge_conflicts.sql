-- Resolve potential merge conflicts with production
-- This migration uses IF NOT EXISTS patterns to avoid conflicts

-- Handle any other enum types that might conflict
DO $$ 
BEGIN
    -- Add other enum types that might exist in production
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE "public"."user_role" AS ENUM (
            'reader',
            'author',
            'moderator',
            'admin'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
        CREATE TYPE "public"."article_status" AS ENUM (
            'draft',
            'pending',
            'pending_review',
            'approved',
            'rejected',
            'published'
        );
    END IF;
END $$;

-- Ensure critical functions exist with IF NOT EXISTS pattern
-- This prevents conflicts if they already exist in production

-- Add any other critical schema elements that might conflict
-- using the same IF NOT EXISTS pattern

-- Migration complete: Resolve merge conflicts by using IF NOT EXISTS patterns for schema elements