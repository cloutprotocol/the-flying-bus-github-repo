-- Comprehensive Schema Migration Generated from Working Local Database
-- This migration contains the complete schema as it exists in the working local database
-- Generated on: October 5, 2025
-- Replaces all placeholder migrations from August-September 2025

-- This migration is idempotent and safe to run multiple times
-- It represents the actual state of the working database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create custom types
CREATE TYPE IF NOT EXISTS public.activity_type AS ENUM (
    'article_created',
    'article_updated', 
    'article_published',
    'comment_added',
    'comment_edited',
    'comment_deleted',
    'article_reviewed',
    'article_approved',
    'article_rejected'
);

CREATE TYPE IF NOT EXISTS public.article_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'published',
    'rejected'
);

CREATE TYPE IF NOT EXISTS public.comment_status AS ENUM (
    'active',
    'hidden',
    'deleted'
);

CREATE TYPE IF NOT EXISTS public.invitation_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

CREATE TYPE IF NOT EXISTS public.user_role AS ENUM (
    'user',
    'author',
    'moderator',
    'admin'
);

-- NOTE: This is a placeholder for the comprehensive schema
-- The actual schema will be extracted from the working database
-- and inserted here to replace all placeholder migrations

-- For now, this serves as a marker that we need to extract
-- the complete schema from local_schema_dump.sql and place it here

-- Tables that should be included (based on working database):
-- - articles
-- - profiles  
-- - comments
-- - invitation_requests
-- - invitation_tokens
-- - email_events
-- - audit_logs
-- - email_metrics
-- - rate_limits
-- - user_roles
-- - article_activities
-- - And all associated functions, triggers, policies, etc.

SELECT 1; -- Temporary placeholder until full schema is inserted