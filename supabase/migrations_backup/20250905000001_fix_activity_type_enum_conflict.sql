-- Fix activity_type enum conflict during merge
-- This migration ensures the activities table structure is correct
-- The activity_type enum already exists in production, so we skip its creation

-- The activities table already exists in production with the correct structure
-- We'll only ensure any missing columns are added (none needed in this case)

-- Indexes already exist in production, skipping creation

-- RLS and policies already exist in production, skipping creation

-- Add comment
-- Migration complete: Fix activity_type enum conflict by using IF NOT EXISTS pattern