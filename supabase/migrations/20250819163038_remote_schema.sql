-- Complete Remote Schema Migration
-- This migration contains the full database schema as applied to production
-- Generated from production database schema and local working database

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create custom types
CREATE TYPE "public"."activity_type" AS ENUM (
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

ALTER TYPE "public"."activity_type" OWNER TO "postgres";

CREATE TYPE "public"."article_status" AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'published',
    'rejected'
);

ALTER TYPE "public"."article_status" OWNER TO "postgres";

CREATE TYPE "public"."comment_status" AS ENUM (
    'active',
    'hidden',
    'deleted'
);

ALTER TYPE "public"."comment_status" OWNER TO "postgres";

CREATE TYPE "public"."invitation_status" AS ENUM (    'pen
ding',
    'approved',
    'rejected'
);

ALTER TYPE "public"."invitation_status" OWNER TO "postgres";

CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'author',
    'moderator',
    'admin'
);

ALTER TYPE "public"."user_role" OWNER TO "postgres";

-- Create tables
CREATE TABLE "public"."achievement_types" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "description" text NOT NULL,
    "icon" text,
    "category" text DEFAULT 'reading'::text,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."achievement_types" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."activities" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "activity_type" activity_type NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" uuid NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."article_reviews" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "article_id" uuid NOT NULL,
    "reviewer_id" uuid NOT NULL,
    "status" text NOT NULL,
    "feedback" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."article_reviews" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."article_revisions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "article_id" uuid NOT NULL,
    "editor_id" uuid NOT NULL,
    "content" text NOT NULL,
    "revision_note" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."article_revisions" ENABLE ROW LEVEL SECURITY;CREAT
E TABLE "public"."article_tags" (
    "article_id" uuid NOT NULL,
    "tag_id" uuid NOT NULL
);

ALTER TABLE "public"."article_tags" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."article_views" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "article_id" uuid NOT NULL,
    "user_id" uuid,
    "ip_address" text,
    "viewed_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."article_views" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."article_votes" (
    "article_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "vote" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."article_votes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."articles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "title" text NOT NULL,
    "slug" text NOT NULL,
    "content" text NOT NULL,
    "excerpt" text,
    "author_id" uuid,
    "category_id" uuid NOT NULL,
    "cover_image" text,
    "status" text NOT NULL DEFAULT 'draft'::text,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "article_type" text NOT NULL DEFAULT 'standard'::text,
    "featured" boolean NOT NULL DEFAULT false,
    "submitted_for_review_at" timestamp with time zone,
    "reviewed_by" uuid,
    "review_notes" text
);

ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."audit_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "action" text NOT NULL,
    "resource_type" text NOT NULL,
    "resource_id" text NOT NULL,
    "user_email" text,
    "success" boolean NOT NULL DEFAULT false,
    "error_message" text,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    "ip_address" text,
    "user_id" uuid,
    "user_agent" text
);

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;CREATE
 TABLE "public"."categories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "icon" text,
    "color" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."comment_likes" (
    "comment_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."comments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "parent_id" uuid,
    "content" text NOT NULL,
    "status" text NOT NULL DEFAULT 'published'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "article_id" text NOT NULL
);

ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."debate_articles" (
    "article_id" uuid NOT NULL,
    "question" text NOT NULL,
    "yes_position" text NOT NULL,
    "no_position" text NOT NULL,
    "voting_enabled" boolean NOT NULL DEFAULT true,
    "voting_ends_at" timestamp with time zone
);

ALTER TABLE "public"."debate_articles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_events" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "type" text NOT NULL,
    "email" text NOT NULL,
    "template" text,
    "message_id" text,
    "error" text,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "timestamp" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."email_events" ENABLE ROW LEVEL SECURITY;C
REATE TABLE "public"."email_metrics" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "metric_type" text NOT NULL,
    "email_type" text NOT NULL,
    "recipient_email" text NOT NULL,
    "message_id" text,
    "error_message" text,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."email_metrics" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."flagged_content" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "content_type" text NOT NULL,
    "content_id" uuid NOT NULL,
    "reporter_id" uuid NOT NULL,
    "reason" text NOT NULL,
    "status" text NOT NULL DEFAULT 'pending'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "reviewed_at" timestamp with time zone,
    "reviewer_id" uuid
);

ALTER TABLE "public"."flagged_content" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."invitation_requests" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "parent_name" text NOT NULL,
    "parent_email" text NOT NULL,
    "child_name" text NOT NULL,
    "child_age" integer NOT NULL,
    "message" text,
    "status" text NOT NULL DEFAULT 'pending'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "reviewed_at" timestamp with time zone,
    "reviewer_id" uuid,
    "child_user_id" uuid,
    "confirmation_email_sent_at" timestamp with time zone,
    "invitation_email_sent_at" timestamp with time zone
);

CREATE TABLE "public"."invitation_tokens" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" text NOT NULL,
    "email" text NOT NULL,
    "invitation_request_id" uuid,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "used_by" uuid,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."invitation_tokens" ENABLE ROW LEVEL SECURITY;CREA
TE TABLE "public"."media_assets" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "filename" text NOT NULL,
    "file_type" text NOT NULL,
    "storage_path" text NOT NULL,
    "mime_type" text,
    "size_bytes" integer,
    "width" integer,
    "height" integer,
    "duration" integer,
    "alt_text" text,
    "uploader_id" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."performance_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "function_name" text NOT NULL,
    "duration_ms" integer NOT NULL,
    "context" jsonb DEFAULT '{}'::jsonb,
    "logged_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "public"."privacy_settings" (
    "user_id" uuid NOT NULL,
    "show_comment_history" boolean NOT NULL DEFAULT true,
    "show_reading_activity" boolean NOT NULL DEFAULT true,
    "profile_visibility" text NOT NULL DEFAULT 'public'::text,
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "show_badges" boolean NOT NULL DEFAULT true,
    "show_achievements" boolean NOT NULL DEFAULT true
);

ALTER TABLE "public"."privacy_settings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL,
    "username" text NOT NULL,
    "display_name" text NOT NULL,
    "avatar_url" text,
    "bio" text,
    "email" text NOT NULL,
    "role" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "crypto_wallet_address" text,
    "badge_display_preferences" jsonb DEFAULT '{}'::jsonb,
    "public_bio" text,
    "favorite_categories" text[]
);

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;CREATE TA
BLE "public"."rate_limit_attempts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "action" text NOT NULL,
    "identifier" text NOT NULL,
    "success" boolean NOT NULL DEFAULT true,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."rate_limit_attempts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."registration_contexts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "registration_type" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "completed_at" timestamp with time zone,
    "metadata" jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE "public"."registration_contexts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."storyboard_episodes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "series_id" uuid NOT NULL,
    "article_id" uuid NOT NULL,
    "episode_number" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "title" text NOT NULL DEFAULT 'Untitled Episode'::text,
    "description" text,
    "video_url" text,
    "thumbnail_url" text,
    "duration" text,
    "published_at" timestamp with time zone DEFAULT now(),
    "status" text DEFAULT 'published'::text
);

ALTER TABLE "public"."storyboard_episodes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."storyboard_series" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "title" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "cover_image" text,
    "author_id" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "status" text NOT NULL DEFAULT 'active'::text,
    "category_id" uuid,
    "featured" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "excerpt" text
);

ALTER TABLE "public"."storyboard_series" ENABLE ROW LEVEL SECURITY;C
REATE TABLE "public"."system_configuration" (
    "key" text NOT NULL,
    "value" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "is_sensitive" boolean DEFAULT false
);

ALTER TABLE "public"."system_configuration" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tags" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_achievements" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "achievement_name" text NOT NULL,
    "achieved_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_reading_stats" (
    "user_id" uuid NOT NULL,
    "articles_read" integer NOT NULL DEFAULT 0,
    "reading_streak" integer NOT NULL DEFAULT 0,
    "last_read_date" date,
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."user_reading_stats" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."video_articles" (
    "article_id" uuid NOT NULL,
    "video_url" text NOT NULL,
    "video_duration" integer,
    "transcript" text
);

ALTER TABLE "public"."video_articles" ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX achievement_types_pkey ON public.achievement_types USING btree (id);
CREATE INDEX activities_created_at_idx ON public.activities USING btree (created_at DESC);
CREATE INDEX activities_entity_type_idx ON public.activities USING btree (entity_type);
CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);
CREATE INDEX activities_user_id_idx ON public.activities USING btree (user_id);CREATE U
NIQUE INDEX article_reviews_pkey ON public.article_reviews USING btree (id);
CREATE UNIQUE INDEX article_revisions_pkey ON public.article_revisions USING btree (id);
CREATE UNIQUE INDEX article_tags_pkey ON public.article_tags USING btree (article_id, tag_id);
CREATE UNIQUE INDEX article_views_pkey ON public.article_views USING btree (id);
CREATE UNIQUE INDEX article_votes_pkey ON public.article_votes USING btree (article_id, user_id);
CREATE UNIQUE INDEX articles_pkey ON public.articles USING btree (id);
CREATE UNIQUE INDEX articles_slug_key ON public.articles USING btree (slug);
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);
CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);
CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);
CREATE UNIQUE INDEX comment_likes_pkey ON public.comment_likes USING btree (comment_id, user_id);
CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);
CREATE UNIQUE INDEX debate_articles_pkey ON public.debate_articles USING btree (article_id);
CREATE UNIQUE INDEX email_events_pkey ON public.email_events USING btree (id);
CREATE UNIQUE INDEX email_metrics_pkey ON public.email_metrics USING btree (id);
CREATE UNIQUE INDEX flagged_content_pkey ON public.flagged_content USING btree (id);
CREATE INDEX idx_activities_user_id ON public.activities USING btree (user_id);
CREATE INDEX idx_articles_reviewed_by ON public.articles USING btree (reviewed_by);
CREATE INDEX idx_articles_submitted_for_review_at ON public.articles USING btree (submitted_for_review_at);
CREATE INDEX idx_audit_logs_action_created_at ON public.audit_logs USING btree (action, created_at);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_logs_ip_address ON public.audit_logs USING btree (ip_address) WHERE (ip_address IS NOT NULL);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs USING btree (resource_type);
CREATE INDEX idx_audit_logs_resource_type_created_at ON public.audit_logs USING btree (resource_type, created_at);
CREATE INDEX idx_audit_logs_success_created_at ON public.audit_logs USING btree (success, created_at);
CREATE INDEX idx_audit_logs_user_agent ON public.audit_logs USING btree (user_agent) WHERE (user_agent IS NOT NULL);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_email_events_email ON public.email_events USING btree (email);
CREATE INDEX idx_email_events_email_timestamp ON public.email_events USING btree (email, "timestamp");
CREATE INDEX idx_email_events_template_timestamp ON public.email_events USING btree (template, "timestamp");
CREATE INDEX idx_email_events_timestamp ON public.email_events USING btree ("timestamp");
CREATE INDEX idx_email_events_type_timestamp ON public.email_events USING btree (type, "timestamp");
CREATE INDEX idx_email_metrics_created_at ON public.email_metrics USING btree (created_at);
CREATE INDEX idx_email_metrics_email_type ON public.email_metrics USING btree (email_type);
CREATE INDEX idx_email_metrics_name_period_placeholder ON public.email_metrics USING btree (id);
CREATE INDEX idx_email_metrics_recipient ON public.email_metrics USING btree (recipient_email);
CREATE INDEX idx_email_metrics_type ON public.email_metrics USING btree (metric_type);
CREATE INDEX idx_flagged_content_comment ON public.flagged_content USING btree (content_id, content_type);
CREATE INDEX idx_invitation_requests_created_at ON public.invitation_requests USING btree (created_at DESC);
CREATE INDEX idx_invitation_requests_status ON public.invitation_requests USING btree (status);CREATE IN
DEX idx_invitation_tokens_email ON public.invitation_tokens USING btree (email);
CREATE INDEX idx_invitation_tokens_expires_at ON public.invitation_tokens USING btree (expires_at);
CREATE INDEX idx_invitation_tokens_invitation_request_id ON public.invitation_tokens USING btree (invitation_request_id);
CREATE INDEX idx_invitation_tokens_token_hash ON public.invitation_tokens USING btree (token_hash);
CREATE INDEX idx_invitation_tokens_used_by_lookup ON public.invitation_tokens USING btree (used_by, used_at) WHERE ((used_by IS NOT NULL) AND (used_at IS NOT NULL));
CREATE INDEX idx_rate_limit_attempts_action_identifier ON public.rate_limit_attempts USING btree (action, identifier);
CREATE INDEX idx_rate_limit_attempts_created_at ON public.rate_limit_attempts USING btree (created_at);
CREATE INDEX idx_registration_contexts_cleanup ON public.registration_contexts USING btree (created_at, completed_at);
CREATE INDEX idx_registration_contexts_completed_at ON public.registration_contexts USING btree (completed_at);
CREATE INDEX idx_registration_contexts_created_at ON public.registration_contexts USING btree (created_at);
CREATE INDEX idx_registration_contexts_type ON public.registration_contexts USING btree (registration_type);
CREATE INDEX idx_registration_contexts_user_id ON public.registration_contexts USING btree (user_id);
CREATE INDEX idx_registration_contexts_user_id_active ON public.registration_contexts USING btree (user_id, created_at) WHERE (completed_at IS NULL);
CREATE UNIQUE INDEX invitation_requests_pkey ON public.invitation_requests USING btree (id);
CREATE UNIQUE INDEX invitation_tokens_pkey ON public.invitation_tokens USING btree (id);
CREATE UNIQUE INDEX media_assets_pkey ON public.media_assets USING btree (id);
CREATE UNIQUE INDEX performance_logs_pkey ON public.performance_logs USING btree (id);
CREATE UNIQUE INDEX privacy_settings_pkey ON public.privacy_settings USING btree (user_id);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);
CREATE UNIQUE INDEX rate_limit_attempts_pkey ON public.rate_limit_attempts USING btree (id);
CREATE UNIQUE INDEX registration_contexts_pkey ON public.registration_contexts USING btree (id);
CREATE UNIQUE INDEX storyboard_episodes_pkey ON public.storyboard_episodes USING btree (id);
CREATE UNIQUE INDEX storyboard_episodes_series_id_episode_number_key ON public.storyboard_episodes USING btree (series_id, episode_number);
CREATE UNIQUE INDEX storyboard_series_pkey ON public.storyboard_series USING btree (id);
CREATE UNIQUE INDEX storyboard_series_slug_key ON public.storyboard_series USING btree (slug);
CREATE UNIQUE INDEX system_configuration_pkey ON public.system_configuration USING btree (key);
CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);
CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);
CREATE UNIQUE INDEX tags_slug_key ON public.tags USING btree (slug);
CREATE UNIQUE INDEX user_achievements_pkey ON public.user_achievements USING btree (id);
CREATE UNIQUE INDEX user_achievements_user_id_achievement_name_key ON public.user_achievements USING btree (user_id, achievement_name);
CREATE UNIQUE INDEX user_reading_stats_pkey ON public.user_reading_stats USING btree (user_id);
CREATE UNIQUE INDEX video_articles_pkey ON public.video_articles USING btree (article_id);-- A
dd primary key constraints
ALTER TABLE "public"."achievement_types" ADD CONSTRAINT "achievement_types_pkey" PRIMARY KEY USING INDEX "achievement_types_pkey";
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_pkey" PRIMARY KEY USING INDEX "activities_pkey";
ALTER TABLE "public"."article_reviews" ADD CONSTRAINT "article_reviews_pkey" PRIMARY KEY USING INDEX "article_reviews_pkey";
ALTER TABLE "public"."article_revisions" ADD CONSTRAINT "article_revisions_pkey" PRIMARY KEY USING INDEX "article_revisions_pkey";
ALTER TABLE "public"."article_tags" ADD CONSTRAINT "article_tags_pkey" PRIMARY KEY USING INDEX "article_tags_pkey";
ALTER TABLE "public"."article_views" ADD CONSTRAINT "article_views_pkey" PRIMARY KEY USING INDEX "article_views_pkey";
ALTER TABLE "public"."article_votes" ADD CONSTRAINT "article_votes_pkey" PRIMARY KEY USING INDEX "article_votes_pkey";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_pkey" PRIMARY KEY USING INDEX "articles_pkey";
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY USING INDEX "audit_logs_pkey";
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY USING INDEX "categories_pkey";
ALTER TABLE "public"."comment_likes" ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY USING INDEX "comment_likes_pkey";
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_pkey" PRIMARY KEY USING INDEX "comments_pkey";
ALTER TABLE "public"."debate_articles" ADD CONSTRAINT "debate_articles_pkey" PRIMARY KEY USING INDEX "debate_articles_pkey";
ALTER TABLE "public"."email_events" ADD CONSTRAINT "email_events_pkey" PRIMARY KEY USING INDEX "email_events_pkey";
ALTER TABLE "public"."email_metrics" ADD CONSTRAINT "email_metrics_pkey" PRIMARY KEY USING INDEX "email_metrics_pkey";
ALTER TABLE "public"."flagged_content" ADD CONSTRAINT "flagged_content_pkey" PRIMARY KEY USING INDEX "flagged_content_pkey";
ALTER TABLE "public"."invitation_requests" ADD CONSTRAINT "invitation_requests_pkey" PRIMARY KEY USING INDEX "invitation_requests_pkey";
ALTER TABLE "public"."invitation_tokens" ADD CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY USING INDEX "invitation_tokens_pkey";
ALTER TABLE "public"."media_assets" ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY USING INDEX "media_assets_pkey";
ALTER TABLE "public"."performance_logs" ADD CONSTRAINT "performance_logs_pkey" PRIMARY KEY USING INDEX "performance_logs_pkey";
ALTER TABLE "public"."privacy_settings" ADD CONSTRAINT "privacy_settings_pkey" PRIMARY KEY USING INDEX "privacy_settings_pkey";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY USING INDEX "profiles_pkey";
ALTER TABLE "public"."rate_limit_attempts" ADD CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY USING INDEX "rate_limit_attempts_pkey";
ALTER TABLE "public"."registration_contexts" ADD CONSTRAINT "registration_contexts_pkey" PRIMARY KEY USING INDEX "registration_contexts_pkey";
ALTER TABLE "public"."storyboard_episodes" ADD CONSTRAINT "storyboard_episodes_pkey" PRIMARY KEY USING INDEX "storyboard_episodes_pkey";
ALTER TABLE "public"."storyboard_series" ADD CONSTRAINT "storyboard_series_pkey" PRIMARY KEY USING INDEX "storyboard_series_pkey";
ALTER TABLE "public"."system_configuration" ADD CONSTRAINT "system_configuration_pkey" PRIMARY KEY USING INDEX "system_configuration_pkey";
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_pkey" PRIMARY KEY USING INDEX "tags_pkey";
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY USING INDEX "user_achievements_pkey";
ALTER TABLE "public"."user_reading_stats" ADD CONSTRAINT "user_reading_stats_pkey" PRIMARY KEY USING INDEX "user_reading_stats_pkey";
ALTER TABLE "public"."video_articles" ADD CONSTRAINT "video_articles_pkey" PRIMARY KEY USING INDEX "video_articles_pkey";-
- Add foreign key constraints and other constraints
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
ALTER TABLE "public"."activities" VALIDATE CONSTRAINT "activities_user_id_fkey";
ALTER TABLE "public"."activities" ADD CONSTRAINT "fk_activities_profiles" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."activities" VALIDATE CONSTRAINT "fk_activities_profiles";

ALTER TABLE "public"."article_reviews" ADD CONSTRAINT "article_reviews_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_reviews" VALIDATE CONSTRAINT "article_reviews_article_id_fkey";
ALTER TABLE "public"."article_reviews" ADD CONSTRAINT "article_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."article_reviews" VALIDATE CONSTRAINT "article_reviews_reviewer_id_fkey";
ALTER TABLE "public"."article_reviews" ADD CONSTRAINT "article_reviews_status_check" CHECK ((status = ANY (ARRAY['approved'::text, 'rejected'::text, 'changes_requested'::text]))) NOT VALID;
ALTER TABLE "public"."article_reviews" VALIDATE CONSTRAINT "article_reviews_status_check";

ALTER TABLE "public"."article_revisions" ADD CONSTRAINT "article_revisions_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_revisions" VALIDATE CONSTRAINT "article_revisions_article_id_fkey";
ALTER TABLE "public"."article_revisions" ADD CONSTRAINT "article_revisions_editor_id_fkey" FOREIGN KEY (editor_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."article_revisions" VALIDATE CONSTRAINT "article_revisions_editor_id_fkey";

ALTER TABLE "public"."article_tags" ADD CONSTRAINT "article_tags_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_tags" VALIDATE CONSTRAINT "article_tags_article_id_fkey";
ALTER TABLE "public"."article_tags" ADD CONSTRAINT "article_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_tags" VALIDATE CONSTRAINT "article_tags_tag_id_fkey";

ALTER TABLE "public"."article_views" ADD CONSTRAINT "article_views_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_views" VALIDATE CONSTRAINT "article_views_article_id_fkey";
ALTER TABLE "public"."article_views" ADD CONSTRAINT "article_views_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."article_views" VALIDATE CONSTRAINT "article_views_user_id_fkey";

ALTER TABLE "public"."article_votes" ADD CONSTRAINT "article_votes_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_votes" VALIDATE CONSTRAINT "article_votes_article_id_fkey";
ALTER TABLE "public"."article_votes" ADD CONSTRAINT "article_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."article_votes" VALIDATE CONSTRAINT "article_votes_user_id_fkey";
ALTER TABLE "public"."article_votes" ADD CONSTRAINT "article_votes_vote_check" CHECK ((vote = ANY (ARRAY['yes'::text, 'no'::text]))) NOT VALID;
ALTER TABLE "public"."article_votes" VALIDATE CONSTRAINT "article_votes_vote_check";ALT
ER TABLE "public"."articles" ADD CONSTRAINT "articles_article_type_check" CHECK ((article_type = ANY (ARRAY['standard'::text, 'debate'::text, 'video'::text, 'storyboard'::text]))) NOT VALID;
ALTER TABLE "public"."articles" VALIDATE CONSTRAINT "articles_article_type_check";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."articles" VALIDATE CONSTRAINT "articles_author_id_fkey";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."articles" VALIDATE CONSTRAINT "articles_category_id_fkey";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) NOT VALID;
ALTER TABLE "public"."articles" VALIDATE CONSTRAINT "articles_reviewed_by_fkey";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_slug_key" UNIQUE USING INDEX "articles_slug_key";
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'published'::text]))) NOT VALID;
ALTER TABLE "public"."articles" VALIDATE CONSTRAINT "articles_status_check";

ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_name_key" UNIQUE USING INDEX "categories_name_key";
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_slug_key" UNIQUE USING INDEX "categories_slug_key";

ALTER TABLE "public"."comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."comment_likes" VALIDATE CONSTRAINT "comment_likes_comment_id_fkey";
ALTER TABLE "public"."comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."comment_likes" VALIDATE CONSTRAINT "comment_likes_user_id_fkey";

ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES comments(id) NOT VALID;
ALTER TABLE "public"."comments" VALIDATE CONSTRAINT "comments_parent_id_fkey";
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text, 'flagged'::text]))) NOT VALID;
ALTER TABLE "public"."comments" VALIDATE CONSTRAINT "comments_status_check";
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."comments" VALIDATE CONSTRAINT "comments_user_id_fkey";

ALTER TABLE "public"."debate_articles" ADD CONSTRAINT "debate_articles_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."debate_articles" VALIDATE CONSTRAINT "debate_articles_article_id_fkey";ALTER
 TABLE "public"."flagged_content" ADD CONSTRAINT "fk_flagged_content_comments" FOREIGN KEY (content_id) REFERENCES comments(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."flagged_content" VALIDATE CONSTRAINT "fk_flagged_content_comments";
ALTER TABLE "public"."flagged_content" ADD CONSTRAINT "flagged_content_content_type_check" CHECK ((content_type = ANY (ARRAY['article'::text, 'comment'::text]))) NOT VALID;
ALTER TABLE "public"."flagged_content" VALIDATE CONSTRAINT "flagged_content_content_type_check";
ALTER TABLE "public"."flagged_content" ADD CONSTRAINT "flagged_content_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."flagged_content" VALIDATE CONSTRAINT "flagged_content_reporter_id_fkey";
ALTER TABLE "public"."flagged_content" ADD CONSTRAINT "flagged_content_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."flagged_content" VALIDATE CONSTRAINT "flagged_content_reviewer_id_fkey";
ALTER TABLE "public"."flagged_content" ADD CONSTRAINT "flagged_content_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'rejected'::text]))) NOT VALID;
ALTER TABLE "public"."flagged_content" VALIDATE CONSTRAINT "flagged_content_status_check";

ALTER TABLE "public"."invitation_requests" ADD CONSTRAINT "invitation_requests_child_age_check" CHECK (((child_age >= 8) AND (child_age <= 14))) NOT VALID;
ALTER TABLE "public"."invitation_requests" VALIDATE CONSTRAINT "invitation_requests_child_age_check";
ALTER TABLE "public"."invitation_requests" ADD CONSTRAINT "invitation_requests_child_user_id_fkey" FOREIGN KEY (child_user_id) REFERENCES profiles(id) NOT VALID;
ALTER TABLE "public"."invitation_requests" VALIDATE CONSTRAINT "invitation_requests_child_user_id_fkey";
ALTER TABLE "public"."invitation_requests" ADD CONSTRAINT "invitation_requests_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) NOT VALID;
ALTER TABLE "public"."invitation_requests" VALIDATE CONSTRAINT "invitation_requests_reviewer_id_fkey";
ALTER TABLE "public"."invitation_requests" ADD CONSTRAINT "invitation_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text]))) NOT VALID;
ALTER TABLE "public"."invitation_requests" VALIDATE CONSTRAINT "invitation_requests_status_check";

ALTER TABLE "public"."invitation_tokens" ADD CONSTRAINT "fk_invitation_tokens_invitation_request_id" FOREIGN KEY (invitation_request_id) REFERENCES invitation_requests(id) NOT VALID;
ALTER TABLE "public"."invitation_tokens" VALIDATE CONSTRAINT "fk_invitation_tokens_invitation_request_id";

ALTER TABLE "public"."media_assets" ADD CONSTRAINT "media_assets_file_type_check" CHECK ((file_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text]))) NOT VALID;
ALTER TABLE "public"."media_assets" VALIDATE CONSTRAINT "media_assets_file_type_check";
ALTER TABLE "public"."media_assets" ADD CONSTRAINT "media_assets_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."media_assets" VALIDATE CONSTRAINT "media_assets_uploader_id_fkey";ALTER T
ABLE "public"."privacy_settings" ADD CONSTRAINT "privacy_settings_profile_visibility_check" CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'private'::text]))) NOT VALID;
ALTER TABLE "public"."privacy_settings" VALIDATE CONSTRAINT "privacy_settings_profile_visibility_check";
ALTER TABLE "public"."privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."privacy_settings" VALIDATE CONSTRAINT "privacy_settings_user_id_fkey";

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."profiles" VALIDATE CONSTRAINT "profiles_id_fkey";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['reader'::text, 'author'::text, 'moderator'::text, 'admin'::text]))) NOT VALID;
ALTER TABLE "public"."profiles" VALIDATE CONSTRAINT "profiles_role_check";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_username_key" UNIQUE USING INDEX "profiles_username_key";

ALTER TABLE "public"."registration_contexts" ADD CONSTRAINT "registration_contexts_registration_type_check" CHECK ((registration_type = ANY (ARRAY['standard'::text, 'invitation'::text]))) NOT VALID;
ALTER TABLE "public"."registration_contexts" VALIDATE CONSTRAINT "registration_contexts_registration_type_check";

ALTER TABLE "public"."storyboard_episodes" ADD CONSTRAINT "storyboard_episodes_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."storyboard_episodes" VALIDATE CONSTRAINT "storyboard_episodes_article_id_fkey";
ALTER TABLE "public"."storyboard_episodes" ADD CONSTRAINT "storyboard_episodes_series_id_episode_number_key" UNIQUE USING INDEX "storyboard_episodes_series_id_episode_number_key";
ALTER TABLE "public"."storyboard_episodes" ADD CONSTRAINT "storyboard_episodes_series_id_fkey" FOREIGN KEY (series_id) REFERENCES storyboard_series(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."storyboard_episodes" VALIDATE CONSTRAINT "storyboard_episodes_series_id_fkey";

ALTER TABLE "public"."storyboard_series" ADD CONSTRAINT "storyboard_series_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE "public"."storyboard_series" VALIDATE CONSTRAINT "storyboard_series_author_id_fkey";
ALTER TABLE "public"."storyboard_series" ADD CONSTRAINT "storyboard_series_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) NOT VALID;
ALTER TABLE "public"."storyboard_series" VALIDATE CONSTRAINT "storyboard_series_category_id_fkey";
ALTER TABLE "public"."storyboard_series" ADD CONSTRAINT "storyboard_series_slug_key" UNIQUE USING INDEX "storyboard_series_slug_key";
ALTER TABLE "public"."storyboard_series" ADD CONSTRAINT "storyboard_series_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text]))) NOT VALID;
ALTER TABLE "public"."storyboard_series" VALIDATE CONSTRAINT "storyboard_series_status_check";

ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_name_key" UNIQUE USING INDEX "tags_name_key";
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_slug_key" UNIQUE USING INDEX "tags_slug_key";ALTER
 TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_user_id_achievement_name_key" UNIQUE USING INDEX "user_achievements_user_id_achievement_name_key";
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."user_achievements" VALIDATE CONSTRAINT "user_achievements_user_id_fkey";

ALTER TABLE "public"."user_reading_stats" ADD CONSTRAINT "user_reading_stats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."user_reading_stats" VALIDATE CONSTRAINT "user_reading_stats_user_id_fkey";

ALTER TABLE "public"."video_articles" ADD CONSTRAINT "video_articles_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."video_articles" VALIDATE CONSTRAINT "video_articles_article_id_fkey";

-- Set function bodies check back on
SET check_function_bodies = off;

-- Note: Functions, triggers, policies, and views are created by subsequent migrations
-- This migration establishes the core schema structure that other migrations build upon

-- Complete schema migration applied successfully
COMMENT ON SCHEMA "public" IS 'Complete application schema with all core tables, indexes, and constraints';