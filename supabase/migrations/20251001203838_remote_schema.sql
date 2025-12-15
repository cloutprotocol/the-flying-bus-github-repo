create extension if not exists "pgjwt" with schema "extensions";

create type "public"."activity_type" as enum ('article_created', 'article_updated', 'article_published', 'comment_added', 'comment_edited', 'comment_deleted', 'article_reviewed', 'article_approved', 'article_rejected');


  create table "public"."achievement_types" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text not null,
    "icon" text,
    "category" text default 'reading'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."achievement_types" enable row level security;


  create table "public"."activities" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "activity_type" activity_type not null,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."activities" enable row level security;


  create table "public"."article_reviews" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" uuid not null,
    "reviewer_id" uuid not null,
    "status" text not null,
    "feedback" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."article_reviews" enable row level security;


  create table "public"."article_revisions" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" uuid not null,
    "editor_id" uuid not null,
    "content" text not null,
    "revision_note" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."article_revisions" enable row level security;


  create table "public"."article_tags" (
    "article_id" uuid not null,
    "tag_id" uuid not null
      );


alter table "public"."article_tags" enable row level security;


  create table "public"."article_views" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" uuid not null,
    "user_id" uuid,
    "ip_address" text,
    "viewed_at" timestamp with time zone not null default now()
      );


alter table "public"."article_views" enable row level security;


  create table "public"."article_votes" (
    "article_id" uuid not null,
    "user_id" uuid not null,
    "vote" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."article_votes" enable row level security;


  create table "public"."articles" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "content" text not null,
    "excerpt" text,
    "author_id" uuid,
    "category_id" uuid not null,
    "cover_image" text,
    "status" text not null default 'draft'::text,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "article_type" text not null default 'standard'::text,
    "featured" boolean not null default false,
    "submitted_for_review_at" timestamp with time zone,
    "reviewed_by" uuid,
    "review_notes" text
      );


alter table "public"."articles" enable row level security;


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "action" text not null,
    "resource_type" text not null,
    "resource_id" text not null,
    "user_email" text,
    "success" boolean not null default false,
    "error_message" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "ip_address" text,
    "user_id" uuid,
    "user_agent" text
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "icon" text,
    "color" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."categories" enable row level security;


  create table "public"."comment_likes" (
    "comment_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."comment_likes" enable row level security;


  create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "parent_id" uuid,
    "content" text not null,
    "status" text not null default 'published'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "article_id" text not null
      );


alter table "public"."comments" enable row level security;


  create table "public"."debate_articles" (
    "article_id" uuid not null,
    "question" text not null,
    "yes_position" text not null,
    "no_position" text not null,
    "voting_enabled" boolean not null default true,
    "voting_ends_at" timestamp with time zone
      );


alter table "public"."debate_articles" enable row level security;


  create table "public"."email_events" (
    "id" uuid not null default gen_random_uuid(),
    "type" text not null,
    "email" text not null,
    "template" text,
    "message_id" text,
    "error" text,
    "metadata" jsonb default '{}'::jsonb,
    "timestamp" timestamp with time zone default now()
      );


alter table "public"."email_events" enable row level security;


  create table "public"."email_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "metric_type" text not null,
    "email_type" text not null,
    "recipient_email" text not null,
    "message_id" text,
    "error_message" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."email_metrics" enable row level security;


  create table "public"."flagged_content" (
    "id" uuid not null default gen_random_uuid(),
    "content_type" text not null,
    "content_id" uuid not null,
    "reporter_id" uuid not null,
    "reason" text not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone,
    "reviewer_id" uuid
      );


alter table "public"."flagged_content" enable row level security;


  create table "public"."invitation_requests" (
    "id" uuid not null default gen_random_uuid(),
    "parent_name" text not null,
    "parent_email" text not null,
    "child_name" text not null,
    "child_age" integer not null,
    "message" text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone,
    "reviewer_id" uuid,
    "child_user_id" uuid,
    "confirmation_email_sent_at" timestamp with time zone,
    "invitation_email_sent_at" timestamp with time zone
      );



  create table "public"."invitation_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "token_hash" text not null,
    "email" text not null,
    "invitation_request_id" uuid,
    "expires_at" timestamp with time zone not null,
    "used_at" timestamp with time zone,
    "used_by" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."invitation_tokens" enable row level security;


  create table "public"."media_assets" (
    "id" uuid not null default gen_random_uuid(),
    "filename" text not null,
    "file_type" text not null,
    "storage_path" text not null,
    "mime_type" text,
    "size_bytes" integer,
    "width" integer,
    "height" integer,
    "duration" integer,
    "alt_text" text,
    "uploader_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."media_assets" enable row level security;


  create table "public"."performance_logs" (
    "id" uuid not null default gen_random_uuid(),
    "function_name" text not null,
    "duration_ms" integer not null,
    "context" jsonb default '{}'::jsonb,
    "logged_at" timestamp with time zone default now()
      );



  create table "public"."privacy_settings" (
    "user_id" uuid not null,
    "show_comment_history" boolean not null default true,
    "show_reading_activity" boolean not null default true,
    "profile_visibility" text not null default 'public'::text,
    "updated_at" timestamp with time zone not null default now(),
    "show_badges" boolean not null default true,
    "show_achievements" boolean not null default true
      );


alter table "public"."privacy_settings" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text not null,
    "display_name" text not null,
    "avatar_url" text,
    "bio" text,
    "email" text not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "crypto_wallet_address" text,
    "badge_display_preferences" jsonb default '{}'::jsonb,
    "public_bio" text,
    "favorite_categories" text[]
      );


alter table "public"."profiles" enable row level security;


  create table "public"."rate_limit_attempts" (
    "id" uuid not null default gen_random_uuid(),
    "action" text not null,
    "identifier" text not null,
    "success" boolean not null default true,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."rate_limit_attempts" enable row level security;


  create table "public"."registration_contexts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "registration_type" text not null,
    "created_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb
      );


alter table "public"."registration_contexts" enable row level security;


  create table "public"."storyboard_episodes" (
    "id" uuid not null default gen_random_uuid(),
    "series_id" uuid not null,
    "article_id" uuid not null,
    "episode_number" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "title" text not null default 'Untitled Episode'::text,
    "description" text,
    "video_url" text,
    "thumbnail_url" text,
    "duration" text,
    "published_at" timestamp with time zone default now(),
    "status" text default 'published'::text
      );


alter table "public"."storyboard_episodes" enable row level security;


  create table "public"."storyboard_series" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "description" text,
    "cover_image" text,
    "author_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "status" text not null default 'active'::text,
    "category_id" uuid,
    "featured" boolean default false,
    "published_at" timestamp with time zone,
    "excerpt" text
      );


alter table "public"."storyboard_series" enable row level security;


  create table "public"."system_configuration" (
    "key" text not null,
    "value" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_sensitive" boolean default false
      );


alter table "public"."system_configuration" enable row level security;


  create table "public"."tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."tags" enable row level security;


  create table "public"."user_achievements" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "achievement_name" text not null,
    "achieved_at" timestamp with time zone not null default now()
      );


alter table "public"."user_achievements" enable row level security;


  create table "public"."user_reading_stats" (
    "user_id" uuid not null,
    "articles_read" integer not null default 0,
    "reading_streak" integer not null default 0,
    "last_read_date" date,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_reading_stats" enable row level security;


  create table "public"."video_articles" (
    "article_id" uuid not null,
    "video_url" text not null,
    "video_duration" integer,
    "transcript" text
      );


alter table "public"."video_articles" enable row level security;

CREATE UNIQUE INDEX achievement_types_pkey ON public.achievement_types USING btree (id);

CREATE INDEX activities_created_at_idx ON public.activities USING btree (created_at DESC);

CREATE INDEX activities_entity_type_idx ON public.activities USING btree (entity_type);

CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);

CREATE INDEX activities_user_id_idx ON public.activities USING btree (user_id);

CREATE UNIQUE INDEX article_reviews_pkey ON public.article_reviews USING btree (id);

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

CREATE INDEX idx_invitation_requests_status ON public.invitation_requests USING btree (status);

CREATE INDEX idx_invitation_tokens_email ON public.invitation_tokens USING btree (email);

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

CREATE UNIQUE INDEX video_articles_pkey ON public.video_articles USING btree (article_id);

alter table "public"."achievement_types" add constraint "achievement_types_pkey" PRIMARY KEY using index "achievement_types_pkey";

alter table "public"."activities" add constraint "activities_pkey" PRIMARY KEY using index "activities_pkey";

alter table "public"."article_reviews" add constraint "article_reviews_pkey" PRIMARY KEY using index "article_reviews_pkey";

alter table "public"."article_revisions" add constraint "article_revisions_pkey" PRIMARY KEY using index "article_revisions_pkey";

alter table "public"."article_tags" add constraint "article_tags_pkey" PRIMARY KEY using index "article_tags_pkey";

alter table "public"."article_views" add constraint "article_views_pkey" PRIMARY KEY using index "article_views_pkey";

alter table "public"."article_votes" add constraint "article_votes_pkey" PRIMARY KEY using index "article_votes_pkey";

alter table "public"."articles" add constraint "articles_pkey" PRIMARY KEY using index "articles_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."comment_likes" add constraint "comment_likes_pkey" PRIMARY KEY using index "comment_likes_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."debate_articles" add constraint "debate_articles_pkey" PRIMARY KEY using index "debate_articles_pkey";

alter table "public"."email_events" add constraint "email_events_pkey" PRIMARY KEY using index "email_events_pkey";

alter table "public"."email_metrics" add constraint "email_metrics_pkey" PRIMARY KEY using index "email_metrics_pkey";

alter table "public"."flagged_content" add constraint "flagged_content_pkey" PRIMARY KEY using index "flagged_content_pkey";

alter table "public"."invitation_requests" add constraint "invitation_requests_pkey" PRIMARY KEY using index "invitation_requests_pkey";

alter table "public"."invitation_tokens" add constraint "invitation_tokens_pkey" PRIMARY KEY using index "invitation_tokens_pkey";

alter table "public"."media_assets" add constraint "media_assets_pkey" PRIMARY KEY using index "media_assets_pkey";

alter table "public"."performance_logs" add constraint "performance_logs_pkey" PRIMARY KEY using index "performance_logs_pkey";

alter table "public"."privacy_settings" add constraint "privacy_settings_pkey" PRIMARY KEY using index "privacy_settings_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."rate_limit_attempts" add constraint "rate_limit_attempts_pkey" PRIMARY KEY using index "rate_limit_attempts_pkey";

alter table "public"."registration_contexts" add constraint "registration_contexts_pkey" PRIMARY KEY using index "registration_contexts_pkey";

alter table "public"."storyboard_episodes" add constraint "storyboard_episodes_pkey" PRIMARY KEY using index "storyboard_episodes_pkey";

alter table "public"."storyboard_series" add constraint "storyboard_series_pkey" PRIMARY KEY using index "storyboard_series_pkey";

alter table "public"."system_configuration" add constraint "system_configuration_pkey" PRIMARY KEY using index "system_configuration_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."user_achievements" add constraint "user_achievements_pkey" PRIMARY KEY using index "user_achievements_pkey";

alter table "public"."user_reading_stats" add constraint "user_reading_stats_pkey" PRIMARY KEY using index "user_reading_stats_pkey";

alter table "public"."video_articles" add constraint "video_articles_pkey" PRIMARY KEY using index "video_articles_pkey";

alter table "public"."activities" add constraint "activities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."activities" validate constraint "activities_user_id_fkey";

alter table "public"."activities" add constraint "fk_activities_profiles" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."activities" validate constraint "fk_activities_profiles";

alter table "public"."article_reviews" add constraint "article_reviews_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."article_reviews" validate constraint "article_reviews_article_id_fkey";

alter table "public"."article_reviews" add constraint "article_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."article_reviews" validate constraint "article_reviews_reviewer_id_fkey";

alter table "public"."article_reviews" add constraint "article_reviews_status_check" CHECK ((status = ANY (ARRAY['approved'::text, 'rejected'::text, 'changes_requested'::text]))) not valid;

alter table "public"."article_reviews" validate constraint "article_reviews_status_check";

alter table "public"."article_revisions" add constraint "article_revisions_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."article_revisions" validate constraint "article_revisions_article_id_fkey";

alter table "public"."article_revisions" add constraint "article_revisions_editor_id_fkey" FOREIGN KEY (editor_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."article_revisions" validate constraint "article_revisions_editor_id_fkey";

alter table "public"."article_tags" add constraint "article_tags_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."article_tags" validate constraint "article_tags_article_id_fkey";

alter table "public"."article_tags" add constraint "article_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."article_tags" validate constraint "article_tags_tag_id_fkey";

alter table "public"."article_views" add constraint "article_views_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."article_views" validate constraint "article_views_article_id_fkey";

alter table "public"."article_views" add constraint "article_views_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."article_views" validate constraint "article_views_user_id_fkey";

alter table "public"."article_votes" add constraint "article_votes_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."article_votes" validate constraint "article_votes_article_id_fkey";

alter table "public"."article_votes" add constraint "article_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."article_votes" validate constraint "article_votes_user_id_fkey";

alter table "public"."article_votes" add constraint "article_votes_vote_check" CHECK ((vote = ANY (ARRAY['yes'::text, 'no'::text]))) not valid;

alter table "public"."article_votes" validate constraint "article_votes_vote_check";

alter table "public"."articles" add constraint "articles_article_type_check" CHECK ((article_type = ANY (ARRAY['standard'::text, 'debate'::text, 'video'::text, 'storyboard'::text]))) not valid;

alter table "public"."articles" validate constraint "articles_article_type_check";

alter table "public"."articles" add constraint "articles_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."articles" validate constraint "articles_author_id_fkey";

alter table "public"."articles" add constraint "articles_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL not valid;

alter table "public"."articles" validate constraint "articles_category_id_fkey";

alter table "public"."articles" add constraint "articles_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) not valid;

alter table "public"."articles" validate constraint "articles_reviewed_by_fkey";

alter table "public"."articles" add constraint "articles_slug_key" UNIQUE using index "articles_slug_key";

alter table "public"."articles" add constraint "articles_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'published'::text]))) not valid;

alter table "public"."articles" validate constraint "articles_status_check";

alter table "public"."categories" add constraint "categories_name_key" UNIQUE using index "categories_name_key";

alter table "public"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "public"."comment_likes" add constraint "comment_likes_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE not valid;

alter table "public"."comment_likes" validate constraint "comment_likes_comment_id_fkey";

alter table "public"."comment_likes" add constraint "comment_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."comment_likes" validate constraint "comment_likes_user_id_fkey";

alter table "public"."comments" add constraint "comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES comments(id) not valid;

alter table "public"."comments" validate constraint "comments_parent_id_fkey";

alter table "public"."comments" add constraint "comments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text, 'flagged'::text]))) not valid;

alter table "public"."comments" validate constraint "comments_status_check";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

alter table "public"."debate_articles" add constraint "debate_articles_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."debate_articles" validate constraint "debate_articles_article_id_fkey";

alter table "public"."flagged_content" add constraint "fk_flagged_content_comments" FOREIGN KEY (content_id) REFERENCES comments(id) ON DELETE CASCADE not valid;

alter table "public"."flagged_content" validate constraint "fk_flagged_content_comments";

alter table "public"."flagged_content" add constraint "flagged_content_content_type_check" CHECK ((content_type = ANY (ARRAY['article'::text, 'comment'::text]))) not valid;

alter table "public"."flagged_content" validate constraint "flagged_content_content_type_check";

alter table "public"."flagged_content" add constraint "flagged_content_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."flagged_content" validate constraint "flagged_content_reporter_id_fkey";

alter table "public"."flagged_content" add constraint "flagged_content_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."flagged_content" validate constraint "flagged_content_reviewer_id_fkey";

alter table "public"."flagged_content" add constraint "flagged_content_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'rejected'::text]))) not valid;

alter table "public"."flagged_content" validate constraint "flagged_content_status_check";

alter table "public"."invitation_requests" add constraint "invitation_requests_child_age_check" CHECK (((child_age >= 8) AND (child_age <= 14))) not valid;

alter table "public"."invitation_requests" validate constraint "invitation_requests_child_age_check";

alter table "public"."invitation_requests" add constraint "invitation_requests_child_user_id_fkey" FOREIGN KEY (child_user_id) REFERENCES profiles(id) not valid;

alter table "public"."invitation_requests" validate constraint "invitation_requests_child_user_id_fkey";

alter table "public"."invitation_requests" add constraint "invitation_requests_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) not valid;

alter table "public"."invitation_requests" validate constraint "invitation_requests_reviewer_id_fkey";

alter table "public"."invitation_requests" add constraint "invitation_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text]))) not valid;

alter table "public"."invitation_requests" validate constraint "invitation_requests_status_check";

alter table "public"."invitation_tokens" add constraint "fk_invitation_tokens_invitation_request_id" FOREIGN KEY (invitation_request_id) REFERENCES invitation_requests(id) not valid;

alter table "public"."invitation_tokens" validate constraint "fk_invitation_tokens_invitation_request_id";

alter table "public"."media_assets" add constraint "media_assets_file_type_check" CHECK ((file_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text]))) not valid;

alter table "public"."media_assets" validate constraint "media_assets_file_type_check";

alter table "public"."media_assets" add constraint "media_assets_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."media_assets" validate constraint "media_assets_uploader_id_fkey";

alter table "public"."privacy_settings" add constraint "privacy_settings_profile_visibility_check" CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'private'::text]))) not valid;

alter table "public"."privacy_settings" validate constraint "privacy_settings_profile_visibility_check";

alter table "public"."privacy_settings" add constraint "privacy_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."privacy_settings" validate constraint "privacy_settings_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['reader'::text, 'author'::text, 'moderator'::text, 'admin'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."registration_contexts" add constraint "registration_contexts_registration_type_check" CHECK ((registration_type = ANY (ARRAY['standard'::text, 'invitation'::text]))) not valid;

alter table "public"."registration_contexts" validate constraint "registration_contexts_registration_type_check";

alter table "public"."storyboard_episodes" add constraint "storyboard_episodes_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."storyboard_episodes" validate constraint "storyboard_episodes_article_id_fkey";

alter table "public"."storyboard_episodes" add constraint "storyboard_episodes_series_id_episode_number_key" UNIQUE using index "storyboard_episodes_series_id_episode_number_key";

alter table "public"."storyboard_episodes" add constraint "storyboard_episodes_series_id_fkey" FOREIGN KEY (series_id) REFERENCES storyboard_series(id) ON DELETE CASCADE not valid;

alter table "public"."storyboard_episodes" validate constraint "storyboard_episodes_series_id_fkey";

alter table "public"."storyboard_series" add constraint "storyboard_series_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."storyboard_series" validate constraint "storyboard_series_author_id_fkey";

alter table "public"."storyboard_series" add constraint "storyboard_series_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."storyboard_series" validate constraint "storyboard_series_category_id_fkey";

alter table "public"."storyboard_series" add constraint "storyboard_series_slug_key" UNIQUE using index "storyboard_series_slug_key";

alter table "public"."storyboard_series" add constraint "storyboard_series_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text]))) not valid;

alter table "public"."storyboard_series" validate constraint "storyboard_series_status_check";

alter table "public"."tags" add constraint "tags_name_key" UNIQUE using index "tags_name_key";

alter table "public"."tags" add constraint "tags_slug_key" UNIQUE using index "tags_slug_key";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_achievement_name_key" UNIQUE using index "user_achievements_user_id_achievement_name_key";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_user_id_fkey";

alter table "public"."user_reading_stats" add constraint "user_reading_stats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_reading_stats" validate constraint "user_reading_stats_user_id_fkey";

alter table "public"."video_articles" add constraint "video_articles_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."video_articles" validate constraint "video_articles_article_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assign_author_role_from_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    invitation_exists BOOLEAN := FALSE;
    audit_context JSONB;
BEGIN
    -- Check if user was created through invitation
    SELECT EXISTS (
        SELECT 1 FROM invitation_tokens 
        WHERE used_by = NEW.id 
        AND used_at IS NOT NULL
    ) INTO invitation_exists;
    
    -- If user was created through invitation, ensure role is set to author
    IF invitation_exists THEN
        -- Only update role if it's not already author
        IF NEW.role != 'author' THEN
            NEW.role = 'author';
            
            -- Create audit context
            audit_context = jsonb_build_object(
                'trigger_name', 'assign_author_role_from_invitation',
                'old_role', COALESCE(OLD.role, 'reader'),
                'new_role', 'author',
                'assignment_method', 'database_trigger',
                'invitation_based', true,
                'user_id', NEW.id,
                'timestamp', NOW()
            );
            
            -- Log the role assignment in audit_logs
            INSERT INTO audit_logs (
                action,
                resource_type,
                resource_id,
                user_email,
                success,
                metadata,
                created_at
            ) VALUES (
                'role_assignment',
                'profile',
                NEW.id::text,
                NEW.email,
                true,
                audit_context,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        INSERT INTO audit_logs (
            action,
            resource_type,
            resource_id,
            user_email,
            success,
            error_message,
            metadata,
            created_at
        ) VALUES (
            'role_assignment_error',
            'profile',
            NEW.id::text,
            NEW.email,
            false,
            SQLERRM,
            jsonb_build_object(
                'trigger_name', 'assign_author_role_from_invitation',
                'error_code', SQLSTATE,
                'timestamp', NOW()
            ),
            NOW()
        );
        
        -- Return NEW to continue with the operation
        RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Automatically set email_confirmed_at to the current timestamp for new users
  -- This effectively disables the email confirmation requirement
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_create_profile_during_registration(profile_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT 
    -- Allow if service role
    auth.role() = 'service_role' OR
    -- Allow if user is creating their own profile
    auth.uid() = profile_user_id OR
    -- Allow if no auth context (system operations)
    auth.uid() IS NULL OR
    -- Allow if admin is creating profile
    (SELECT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ));
$function$
;

CREATE OR REPLACE FUNCTION public.check_email_system_alerts()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
  alerts json[] := '{}';
  health_data json;
  recent_failures integer;
  config_issues json;
BEGIN
  -- Get current health data
  SELECT get_comprehensive_email_health(1) INTO health_data;
  
  -- Check for high failure rate in last hour
  IF (health_data->'overall_stats'->>'success_rate')::decimal < 80 THEN
    alerts := alerts || json_build_object(
      'severity', 'critical',
      'type', 'high_failure_rate',
      'message', 'Email success rate below 80% in the last hour',
      'current_rate', health_data->'overall_stats'->>'success_rate',
      'timestamp', NOW()
    );
  END IF;

  -- Check for configuration issues
  config_issues := health_data->'configuration_health';
  IF NOT (config_issues->>'configuration_valid')::boolean THEN
    alerts := alerts || json_build_object(
      'severity', 'critical',
      'type', 'configuration_invalid',
      'message', 'Email system configuration is invalid',
      'details', config_issues,
      'timestamp', NOW()
    );
  END IF;

  -- Check for recent failures requiring manual intervention
  SELECT COUNT(*) INTO recent_failures
  FROM audit_logs 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND success = false
    AND action LIKE '%email%'
    AND (error_message ILIKE '%configuration%' OR 
         error_message ILIKE '%authentication%' OR
         error_message ILIKE '%network%');

  IF recent_failures > 0 THEN
    alerts := alerts || json_build_object(
      'severity', 'warning',
      'type', 'manual_intervention_needed',
      'message', recent_failures || ' email failures require manual investigation',
      'failure_count', recent_failures,
      'timestamp', NOW()
    );
  END IF;

  -- Check if fallback usage is too high (indicates trigger problems)
  IF (health_data->'fallback_stats'->>'fallback_attempts')::integer > 
     (health_data->'trigger_stats'->>'trigger_attempts')::integer THEN
    alerts := alerts || json_build_object(
      'severity', 'warning',
      'type', 'high_fallback_usage',
      'message', 'Fallback email method being used more than triggers',
      'trigger_attempts', health_data->'trigger_stats'->>'trigger_attempts',
      'fallback_attempts', health_data->'fallback_stats'->>'fallback_attempts',
      'timestamp', NOW()
    );
  END IF;

  result := json_build_object(
    'timestamp', NOW(),
    'alert_count', array_length(alerts, 1),
    'alerts', alerts,
    'system_status', health_data->>'system_status'
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_email_system_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  supabase_url text;
  service_role_key text;
  pg_net_available boolean;
  health_status jsonb;
BEGIN
  -- Get configuration parameters
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Check if pg_net extension is available
  BEGIN
    PERFORM 1 FROM pg_extension WHERE extname = 'pg_net';
    pg_net_available := true;
  EXCEPTION WHEN OTHERS THEN
    pg_net_available := false;
  END;
  
  -- Build health status
  health_status := jsonb_build_object(
    'supabase_url_configured', (supabase_url IS NOT NULL AND supabase_url != ''),
    'service_role_key_configured', (service_role_key IS NOT NULL AND service_role_key != ''),
    'pg_net_available', pg_net_available,
    'timestamp', NOW(),
    'overall_health', 
      CASE 
        WHEN (supabase_url IS NOT NULL AND supabase_url != '') AND 
             (service_role_key IS NOT NULL AND service_role_key != '') AND 
             pg_net_available THEN 'healthy'
        WHEN pg_net_available THEN 'degraded'
        ELSE 'unhealthy'
      END
  );
  
  RETURN health_status;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_email_logs(p_days_to_keep integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_events integer;
  deleted_audits integer;
  deleted_metrics integer;
BEGIN
  -- Delete old email events
  DELETE FROM email_events 
  WHERE timestamp < NOW() - (p_days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  -- Delete old audit logs
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::interval
    AND action LIKE '%email%';
  GET DIAGNOSTICS deleted_audits = ROW_COUNT;

  -- Delete old email metrics
  DELETE FROM email_metrics 
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_metrics = ROW_COUNT;

  RETURN json_build_object(
    'deleted_events', deleted_events,
    'deleted_audits', deleted_audits,
    'deleted_metrics', deleted_metrics,
    'cleanup_date', NOW(),
    'days_kept', p_days_to_keep
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_registration_contexts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Delete registration contexts older than 1 hour that are incomplete
  DELETE FROM public.registration_contexts 
  WHERE created_at < NOW() - INTERVAL '1 hour'
  AND completed_at IS NULL;
  
  -- Delete completed registration contexts older than 7 days
  DELETE FROM public.registration_contexts 
  WHERE completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_registration_context(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Mark registration as completed
  UPDATE public.registration_contexts 
  SET completed_at = NOW()
  WHERE user_id = p_user_id 
  AND completed_at IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_all_existing_users()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
  WHERE email_confirmed_at IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_media_bucket_if_not_exists()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_registration_context(p_user_id uuid, p_registration_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  context_id uuid;
BEGIN
  -- Insert registration context
  INSERT INTO public.registration_contexts (
    user_id,
    registration_type,
    metadata
  ) VALUES (
    p_user_id,
    p_registration_type,
    p_metadata
  ) RETURNING id INTO context_id;
  
  RETURN context_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_storyboard_series(p_user_id uuid, p_series_data jsonb, p_episodes_data jsonb)
 RETURNS TABLE(success boolean, error_message text, series_id uuid, duration_ms integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_series_id UUID;
  v_episode_data JSONB;
  v_episode_title TEXT;
  v_episode_number INTEGER;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_duration_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  BEGIN
    -- Create the series
    INSERT INTO storyboard_series (
      title,
      slug,
      description,
      cover_image,
      category_id,
      author_id,
      status,
      excerpt
    ) VALUES (
      p_series_data->>'title',
      p_series_data->>'slug',
      p_series_data->>'description',
      p_series_data->>'coverImage',
      (p_series_data->>'categoryId')::UUID,
      p_user_id,
      COALESCE(p_series_data->>'status', 'active'),
      p_series_data->>'excerpt'
    )
    RETURNING id INTO v_series_id;
    
    -- Create episodes if provided
    IF p_episodes_data IS NOT NULL THEN
      FOR v_episode_data IN SELECT * FROM jsonb_array_elements(p_episodes_data)
      LOOP
        v_episode_title := v_episode_data->>'title';
        v_episode_number := (v_episode_data->>'number')::INTEGER;
        
        -- Create a dummy article for each episode
        INSERT INTO articles (
          title,
          content,
          excerpt,
          cover_image,
          category_id,
          author_id,
          status,
          article_type,
          slug
        ) VALUES (
          v_episode_title,
          COALESCE(v_episode_data->>'content', ''),
          v_episode_data->>'description',
          v_episode_data->>'thumbnailUrl',
          (p_series_data->>'categoryId')::UUID,
          p_user_id,
          'published',
          'storyboard',
          LOWER(REGEXP_REPLACE(v_episode_title, '[^\w\s]', '', 'g')) || '-episode-' || v_episode_number
        );
        
        -- Link episode to series
        INSERT INTO storyboard_episodes (
          series_id,
          article_id,
          episode_number,
          title,
          description
        ) VALUES (
          v_series_id,
          (SELECT id FROM articles WHERE slug = LOWER(REGEXP_REPLACE(v_episode_title, '[^\w\s]', '', 'g')) || '-episode-' || v_episode_number),
          v_episode_number,
          v_episode_title,
          v_episode_data->>'description'
        );
      END LOOP;
    END IF;
    
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    
    RETURN QUERY SELECT true, NULL::TEXT, v_series_id, v_duration_ms;
    
  EXCEPTION WHEN OTHERS THEN
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    RETURN QUERY SELECT false, SQLERRM, NULL::UUID, v_duration_ms;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fix_user_role_with_audit(target_user_id uuid, target_email text, old_role text, new_role text, reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    rows_affected INTEGER;
    audit_context JSONB;
BEGIN
    -- Create audit context
    audit_context = jsonb_build_object(
        'migration_name', 'fix_existing_user_roles_migration',
        'old_role', old_role,
        'new_role', new_role,
        'reason', reason,
        'user_id', target_user_id,
        'timestamp', NOW(),
        'assignment_method', 'migration_fix'
    );
    
    -- Update the user role
    UPDATE profiles 
    SET 
        role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Log the role change in audit_logs
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        user_email,
        success,
        metadata,
        created_at
    ) VALUES (
        'role_migration_fix',
        'profile',
        target_user_id::text,
        target_email,
        rows_affected > 0,
        audit_context,
        NOW()
    );
    
    RETURN rows_affected > 0;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO audit_logs (
            action,
            resource_type,
            resource_id,
            user_email,
            success,
            error_message,
            metadata,
            created_at
        ) VALUES (
            'role_migration_error',
            'profile',
            target_user_id::text,
            target_email,
            false,
            SQLERRM,
            jsonb_build_object(
                'migration_name', 'fix_existing_user_roles_migration',
                'error_code', SQLSTATE,
                'timestamp', NOW(),
                'reason', reason
            ),
            NOW()
        );
        
        RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_comprehensive_email_health(p_hours_back integer DEFAULT 24)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
  email_stats json;
  trigger_stats json;
  fallback_stats json;
  error_analysis json;
  recent_failures json[];
  config_health json;
BEGIN
  -- Get overall email statistics
  SELECT json_build_object(
    'total_events', COUNT(*),
    'successful_sends', COUNT(*) FILTER (WHERE type IN ('sent', 'delivered')),
    'failed_sends', COUNT(*) FILTER (WHERE type IN ('failed', 'bounced')),
    'pending_sends', COUNT(*) FILTER (WHERE type IN ('sending', 'queued')),
    'skipped_sends', COUNT(*) FILTER (WHERE type = 'skipped'),
    'success_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE type IN ('sent', 'delivered'))::decimal / 
         COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
      )
      ELSE 100
    END
  ) INTO email_stats
  FROM email_events 
  WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval;

  -- Get trigger-specific statistics
  SELECT json_build_object(
    'trigger_attempts', COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger'),
    'trigger_successes', COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered')),
    'trigger_failures', COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('failed', 'bounced')),
    'trigger_success_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered'))::decimal / 
         COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger' AND type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
      )
      ELSE 100
    END
  ) INTO trigger_stats
  FROM email_events 
  WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval;

  -- Get fallback-specific statistics
  SELECT json_build_object(
    'fallback_attempts', COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback'),
    'fallback_successes', COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered')),
    'fallback_failures', COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('failed', 'bounced')),
    'fallback_success_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered'))::decimal / 
         COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback' AND type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
      )
      ELSE 100
    END
  ) INTO fallback_stats
  FROM email_events 
  WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval;

  -- Analyze error patterns
  SELECT json_build_object(
    'common_errors', json_agg(error_summary ORDER BY error_count DESC)
  ) INTO error_analysis
  FROM (
    SELECT 
      COALESCE(error, 'Unknown error') as error_type,
      COUNT(*) as error_count,
      json_build_object(
        'error_type', COALESCE(error, 'Unknown error'),
        'count', COUNT(*),
        'templates_affected', array_agg(DISTINCT template),
        'last_occurrence', MAX(timestamp)
      ) as error_summary
    FROM email_events 
    WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval
      AND type IN ('failed', 'bounced')
      AND error IS NOT NULL
    GROUP BY error
    LIMIT 10
  ) error_groups;

  -- Get recent critical failures
  SELECT array_agg(
    json_build_object(
      'timestamp', timestamp,
      'email', email,
      'template', template,
      'error', error,
      'metadata', metadata
    ) ORDER BY timestamp DESC
  ) INTO recent_failures
  FROM email_events 
  WHERE timestamp > NOW() - INTERVAL '1 hour'
    AND type IN ('failed', 'bounced')
  LIMIT 5;

  -- Get configuration health
  SELECT validate_email_configuration() INTO config_health;

  -- Build comprehensive result
  result := json_build_object(
    'timestamp', NOW(),
    'period_hours', p_hours_back,
    'overall_stats', email_stats,
    'trigger_stats', trigger_stats,
    'fallback_stats', fallback_stats,
    'error_analysis', error_analysis,
    'recent_failures', COALESCE(recent_failures, '{}'),
    'configuration_health', config_health,
    'system_status', CASE 
      WHEN (email_stats->>'success_rate')::decimal >= 95 THEN 'healthy'
      WHEN (email_stats->>'success_rate')::decimal >= 80 THEN 'warning'
      ELSE 'critical'
    END
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_config_setting(setting_name text, default_value text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  config_value text;
BEGIN
  -- Try to get the setting from the configuration table
  BEGIN
    SELECT value INTO config_value FROM system_configuration WHERE key = setting_name;
    
    -- If found and not empty, return it
    IF config_value IS NOT NULL AND config_value != '' THEN
      RETURN config_value;
    END IF;
    
    -- If not found or empty, return the default
    RETURN default_value;
  EXCEPTION WHEN OTHERS THEN
    -- If there's any error accessing the setting, return the default
    RETURN default_value;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_configuration_summary()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  config_items json;
  validation_result json;
BEGIN
  -- Get configuration items
  SELECT json_agg(
    json_build_object(
      'key', key,
      'value', CASE 
        WHEN is_sensitive THEN '[HIDDEN - ' || length(value) || ' characters]'
        ELSE value 
      END,
      'description', description,
      'is_sensitive', is_sensitive,
      'updated_at', updated_at
    ) ORDER BY key
  ) INTO config_items
  FROM system_configuration;
  
  -- Get validation result
  validation_result := validate_email_configuration();
  
  RETURN json_build_object(
    'configuration_items', config_items,
    'validation', validation_result
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_email_metrics_by_template(p_hours_back integer DEFAULT 24)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'template', template,
      'total_attempts', total_attempts,
      'successful_sends', successful_sends,
      'failed_sends', failed_sends,
      'success_rate', success_rate,
      'last_sent', last_sent
    ) ORDER BY total_attempts DESC
  ) INTO result
  FROM (
    SELECT 
      template,
      COUNT(*) as total_attempts,
      COUNT(*) FILTER (WHERE type IN ('sent', 'delivered')) as successful_sends,
      COUNT(*) FILTER (WHERE type IN ('failed', 'bounced')) as failed_sends,
      CASE 
        WHEN COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE type IN ('sent', 'delivered'))::decimal / 
           COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
        )
        ELSE 100
      END as success_rate,
      MAX(timestamp) FILTER (WHERE type IN ('sent', 'delivered')) as last_sent
    FROM email_events 
    WHERE timestamp > NOW() - (p_hours_back || ' hours')::interval
    GROUP BY template
  ) template_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_email_performance_trends(p_days_back integer DEFAULT 7)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'date', date_bucket,
      'total_emails', total_emails,
      'successful_emails', successful_emails,
      'failed_emails', failed_emails,
      'success_rate', success_rate,
      'trigger_attempts', trigger_attempts,
      'fallback_attempts', fallback_attempts
    ) ORDER BY date_bucket
  ) INTO result
  FROM (
    SELECT 
      DATE_TRUNC('day', timestamp) as date_bucket,
      COUNT(*) as total_emails,
      COUNT(*) FILTER (WHERE type IN ('sent', 'delivered')) as successful_emails,
      COUNT(*) FILTER (WHERE type IN ('failed', 'bounced')) as failed_emails,
      CASE 
        WHEN COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced')) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE type IN ('sent', 'delivered'))::decimal / 
           COUNT(*) FILTER (WHERE type IN ('sent', 'delivered', 'failed', 'bounced'))) * 100, 2
        )
        ELSE 100
      END as success_rate,
      COUNT(*) FILTER (WHERE metadata->>'source' = 'database_trigger') as trigger_attempts,
      COUNT(*) FILTER (WHERE metadata->>'source' = 'client_fallback') as fallback_attempts
    FROM email_events 
    WHERE timestamp > NOW() - (p_days_back || ' days')::interval
    GROUP BY DATE_TRUNC('day', timestamp)
  ) daily_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_failed_email_audit_trail(p_hours_back integer DEFAULT 24, p_limit integer DEFAULT 50)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'audit_id', a.id,
      'timestamp', a.created_at,
      'action', a.action,
      'user_email', a.user_email,
      'error_message', a.error_message,
      'email_event_details', json_build_object(
        'event_id', e.id,
        'type', e.type,
        'template', e.template,
        'error', e.error,
        'metadata', e.metadata
      ),
      'requires_manual_followup', CASE 
        WHEN a.error_message ILIKE '%configuration%' OR 
             a.error_message ILIKE '%authentication%' OR
             a.error_message ILIKE '%network%' 
        THEN true 
        ELSE false 
      END
    ) ORDER BY a.created_at DESC
  ) INTO result
  FROM audit_logs a
  LEFT JOIN email_events e ON e.id::text = a.resource_id
  WHERE a.created_at > NOW() - (p_hours_back || ' hours')::interval
    AND a.success = false
    AND a.action LIKE '%email%'
  LIMIT p_limit;

  RETURN COALESCE(result, '[]'::json);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_validated_config(config_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value
  FROM system_configuration
  WHERE key = config_key;
  
  IF config_value IS NULL THEN
    RAISE EXCEPTION 'Configuration key % not found', config_key;
  END IF;
  
  -- Special validation for service role key
  IF config_key = 'supabase_service_role_key' THEN
    IF NOT validate_service_role_key_format(config_value) THEN
      RAISE EXCEPTION 'Invalid service role key format';
    END IF;
  END IF;
  
  RETURN config_value;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_article_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (user_id, activity_type, entity_type, entity_id, metadata)
    VALUES (
      NEW.author_id,
      'article_created',
      'article',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'published' THEN
    INSERT INTO public.activities (user_id, activity_type, entity_type, entity_id, metadata)
    VALUES (
      NEW.author_id,
      'article_published',
      'article',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_bucket_insert_conflict()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If this is an INSERT and the bucket already exists with the same config, just return NULL to skip
    IF TG_OP = 'INSERT' AND NEW.id = 'media' THEN
        IF EXISTS (
            SELECT 1 FROM storage.buckets 
            WHERE id = 'media' 
            AND name = NEW.name 
            AND public = NEW.public 
            AND file_size_limit = NEW.file_size_limit
            AND allowed_mime_types = NEW.allowed_mime_types
        ) THEN
            RAISE NOTICE 'Media bucket already exists with identical configuration, skipping INSERT';
            RETURN NULL; -- This prevents the INSERT
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_comment_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (user_id, activity_type, entity_type, entity_id, metadata)
    VALUES (
      NEW.user_id,
      'comment_added',
      'comment',
      NEW.id,
      jsonb_build_object(
        'article_id', NEW.article_id,
        'content', substring(NEW.content from 1 for 100)
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    default_username TEXT;
    user_display_name TEXT;
    profile_created BOOLEAN := FALSE;
BEGIN
    -- Get username and display_name from signup metadata
    default_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
    
    -- Ensure username is unique by appending numbers if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = default_username) LOOP
        default_username := split_part(NEW.email, '@', 1) || '_' || floor(random() * 1000)::text;
    END LOOP;
    
    -- Insert new profile using the signup data
    -- This function runs as SECURITY DEFINER with elevated privileges
    BEGIN
        INSERT INTO public.profiles (
            id,
            username,
            display_name,
            email,
            role,
            avatar_url,
            bio
        ) VALUES (
            NEW.id,
            default_username,
            user_display_name,
            NEW.email,
            'reader',
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            ''
        );
        
        profile_created := TRUE;
        
        RAISE LOG 'Profile created successfully for user %: username=%, display_name=%', 
                  NEW.id, default_username, user_display_name;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Failed to create profile for user %: % (SQLSTATE: %)', 
                      NEW.id, SQLERRM, SQLSTATE;
            -- Don't fail the user creation, just log the error
    END;
    
    -- Also create privacy settings for the new user (if profile was created)
    IF profile_created THEN
        BEGIN
            INSERT INTO public.privacy_settings (user_id) VALUES (NEW.id)
            ON CONFLICT (user_id) DO NOTHING;
            
            RAISE LOG 'Privacy settings created for user %', NEW.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Failed to create privacy settings for user %: %', NEW.id, SQLERRM;
                -- Don't fail if privacy settings creation fails
        END;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.identify_users_needing_author_role()
 RETURNS TABLE(user_id uuid, user_email text, user_role text, invitation_email text, invitation_status text, should_be_author boolean, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email as user_email,
        p.role as user_role,
        it.email as invitation_email,
        ir.status as invitation_status,
        CASE 
            WHEN p.role != 'author' AND it.email = p.email AND ir.status = 'approved' THEN true
            ELSE false
        END as should_be_author,
        CASE 
            WHEN p.role != 'author' AND it.email = p.email AND ir.status = 'approved' 
            THEN 'User registered with same email as approved invitation token'
            ELSE 'No role change needed'
        END as reason
    FROM profiles p
    LEFT JOIN invitation_tokens it ON it.email = p.email
    LEFT JOIN invitation_requests ir ON ir.id = it.invitation_request_id
    WHERE p.role != 'admin' -- Don't touch admin users
    ORDER BY p.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    user_role text;
BEGIN
    -- Return false immediately if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    -- Return true if user is admin, false otherwise
    RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs (like profile not found), return false
        RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_author_or_above()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('author', 'moderator', 'admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_moderator()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    user_role text;
BEGIN
    -- Return false immediately if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    -- Return true if user is moderator, false otherwise
    RETURN COALESCE(user_role = 'moderator', false);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return false
        RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    user_role text;
BEGIN
    -- Return false immediately if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
    
    -- Return true if user is moderator or admin, false otherwise
    RETURN COALESCE(user_role IN ('moderator', 'admin'), false);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return false
        RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_registration_context()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  -- Check if the current role is service_role (used during registration)
  -- or if there's an active registration context
  SELECT 
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.registration_contexts 
      WHERE user_id = auth.uid() 
      AND completed_at IS NULL
      AND created_at > NOW() - INTERVAL '10 minutes'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_simple(p_action text, p_resource_type text, p_resource_id text, p_success boolean DEFAULT true, p_error_message text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN log_audit_event(
        p_action,
        p_resource_type,
        p_resource_id,
        NULL, -- user_email
        NULL, -- user_id
        p_success,
        p_error_message,
        '{}', -- metadata
        'system', -- ip_address
        'system/function' -- user_agent
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_db_performance(p_function_name text, p_duration_ms integer, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO performance_logs (
    function_name,
    duration_ms,
    context
  ) VALUES (
    p_function_name,
    p_duration_ms,
    p_context
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail to avoid breaking application flow
  -- Could log to a system table if needed
  NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_email_event(event_type text, invitation_id uuid, email_address text, success boolean, error_message text DEFAULT NULL::text, fallback_used boolean DEFAULT false, additional_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO email_events (
    id,
    type,
    email,
    template,
    message_id,
    error,
    metadata,
    timestamp
  ) VALUES (
    gen_random_uuid(),
    event_type,
    email_address,
    CASE 
      WHEN event_type LIKE '%confirmation%' THEN 'invitation_confirmation'
      WHEN event_type LIKE '%invitation%' THEN 'invitation_approved'
      ELSE 'unknown'
    END,
    invitation_id::text,
    error_message,
    jsonb_build_object(
      'success', success,
      'fallback_used', fallback_used,
      'invitation_id', invitation_id,
      'additional_data', additional_data
    ),
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, don't fail the main operation
  RAISE NOTICE 'Failed to log email event: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_email_event(p_status text, p_email text, p_type text, p_reference_id text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  event_id UUID;
  uuid_reference_id UUID;
BEGIN
  -- Generate a UUID for this event
  event_id := gen_random_uuid();
  
  -- Convert reference_id to UUID if it's not null and not empty
  IF p_reference_id IS NOT NULL AND p_reference_id != '' THEN
    BEGIN
      uuid_reference_id := p_reference_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      uuid_reference_id := NULL;
    END;
  ELSE
    uuid_reference_id := NULL;
  END IF;

  -- Call the existing 7-parameter version (which returns void)
  PERFORM log_email_event(
    p_type,                    -- event_type
    uuid_reference_id,         -- invitation_id
    p_email,                   -- email_address
    (p_status = 'sent'),       -- success (true if status is 'sent')
    p_error_message,           -- error_message
    false,                     -- fallback_used (default to false)
    p_metadata                 -- additional_data
  );
  
  RETURN event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_fallback_email_event(p_event_type text, p_email text, p_template text, p_success boolean, p_message_id text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO email_events (
    type,
    email,
    template,
    message_id,
    error,
    metadata
  ) VALUES (
    p_event_type,
    p_email,
    p_template,
    p_message_id,
    p_error_message,
    p_metadata || jsonb_build_object(
      'method', 'client_fallback',
      'success', p_success,
      'logged_at', NOW(),
      'source', 'client_fallback'
    )
  ) RETURNING id INTO v_event_id;
  
  -- Also log to audit_logs for tracking
  INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    user_email,
    success,
    error_message,
    metadata
  ) VALUES (
    CASE WHEN p_success THEN 'email_sent_fallback' ELSE 'email_failed_fallback' END,
    'email_event',
    v_event_id::text,
    p_email,
    p_success,
    p_error_message,
    p_metadata || jsonb_build_object(
      'event_type', p_event_type,
      'template', p_template,
      'method', 'client_fallback'
    )
  );
  
  RETURN v_event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_trigger_email_event(p_event_type text, p_email text, p_template text, p_method text, p_success boolean, p_error_message text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO email_events (
    type,
    email,
    template,
    message_id,
    error,
    metadata
  ) VALUES (
    p_event_type,
    p_email,
    p_template,
    CASE WHEN p_success THEN 'trigger_' || gen_random_uuid()::text ELSE NULL END,
    p_error_message,
    p_metadata || jsonb_build_object(
      'method', p_method,
      'success', p_success,
      'logged_at', NOW(),
      'source', 'database_trigger'
    )
  ) RETURNING id INTO v_event_id;
  
  -- Also log to audit_logs for failed operations
  IF NOT p_success THEN
    INSERT INTO audit_logs (
      action,
      resource_type,
      resource_id,
      user_email,
      success,
      error_message,
      metadata
    ) VALUES (
      'email_send_failed',
      'email_event',
      v_event_id::text,
      p_email,
      false,
      p_error_message,
      p_metadata || jsonb_build_object(
        'event_type', p_event_type,
        'template', p_template,
        'method', p_method
      )
    );
  END IF;
  
  RETURN v_event_id;
END;
$function$
;

create or replace view "public"."recent_audit_events" as  SELECT audit_logs.id,
    audit_logs.action,
    audit_logs.resource_type,
    audit_logs.resource_id,
    audit_logs.user_email,
    audit_logs.user_id,
    audit_logs.success,
    audit_logs.error_message,
        CASE
            WHEN (audit_logs.user_agent = 'system/unknown'::text) THEN 'System'::text
            WHEN (audit_logs.user_agent = 'system/function'::text) THEN 'Database Function'::text
            WHEN (audit_logs.user_agent = 'system/error'::text) THEN 'Error Getting User Agent'::text
            ELSE COALESCE(audit_logs.user_agent, 'Unknown'::text)
        END AS formatted_user_agent,
        CASE
            WHEN (audit_logs.ip_address = 'unknown'::text) THEN 'Unknown'::text
            WHEN (audit_logs.ip_address = 'system'::text) THEN 'System'::text
            ELSE COALESCE(audit_logs.ip_address, 'Unknown'::text)
        END AS formatted_ip_address,
    audit_logs.metadata,
    audit_logs.created_at
   FROM audit_logs
  WHERE (audit_logs.created_at > (now() - '7 days'::interval))
  ORDER BY audit_logs.created_at DESC;


CREATE OR REPLACE FUNCTION public.run_role_migration_with_validation()
 RETURNS TABLE(user_id uuid, user_email text, old_role text, new_role text, success boolean, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_record RECORD;
    fix_result BOOLEAN;
BEGIN
    -- Log migration start
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        success,
        metadata,
        created_at
    ) VALUES (
        'migration_started',
        'role_migration',
        'fix_existing_user_roles',
        true,
        jsonb_build_object(
            'migration_name', 'fix_existing_user_roles_migration',
            'timestamp', NOW()
        ),
        NOW()
    );
    
    -- Process each user that needs role fix
    FOR user_record IN 
        SELECT * FROM identify_users_needing_author_role() 
        WHERE should_be_author = true
    LOOP
        -- Fix the user role
        SELECT fix_user_role_with_audit(
            user_record.user_id,
            user_record.user_email,
            user_record.user_role,
            'author',
            user_record.reason
        ) INTO fix_result;
        
        -- Return the result
        RETURN QUERY SELECT 
            user_record.user_id,
            user_record.user_email,
            user_record.user_role,
            'author'::TEXT,
            fix_result,
            user_record.reason;
    END LOOP;
    
    -- Log migration completion
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        success,
        metadata,
        created_at
    ) VALUES (
        'migration_completed',
        'role_migration',
        'fix_existing_user_roles',
        true,
        jsonb_build_object(
            'migration_name', 'fix_existing_user_roles_migration',
            'timestamp', NOW()
        ),
        NOW()
    );
    
    RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.safe_create_view_index(view_name text, index_name text, column_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if the object is a view
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = view_name AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Cannot create index % on view %. Views do not support indexes. Skipping.', index_name, view_name;
        RETURN;
    END IF;
    
    -- If it's not a view, try to create the index
    BEGIN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(%I)', index_name, view_name, column_name);
        RAISE NOTICE 'Created index % on table %', index_name, view_name;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create index % on %: %', index_name, view_name, SQLERRM;
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_article_draft(p_article_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_article_id UUID;
  v_author_id UUID;
  v_article_type TEXT;
  v_article_title TEXT;
  v_result_id UUID;
  v_existing_article_id UUID;
BEGIN
  -- Extract data from the input
  v_article_id := (p_article_data->>'id')::UUID;
  v_author_id := (p_article_data->>'author_id')::UUID;
  v_article_type := p_article_data->>'articleType';
  v_article_title := p_article_data->>'title';
  
  -- IMPORTANT: Check for duplicate drafts if no ID is provided
  IF v_article_id IS NULL AND v_article_title IS NOT NULL AND v_author_id IS NOT NULL THEN
    -- Try to find existing draft with same title and author
    SELECT id INTO v_existing_article_id
    FROM articles
    WHERE 
      title = v_article_title 
      AND author_id = v_author_id
      AND status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Use existing article id if found to prevent duplicates
    IF v_existing_article_id IS NOT NULL THEN
      v_article_id := v_existing_article_id;
    END IF;
  END IF;
  
  -- Handle insert or update based on whether article exists
  IF v_article_id IS NULL THEN
    -- Insert new article
    INSERT INTO articles (
      title,
      content,
      excerpt,
      cover_image,
      category_id,
      author_id,
      status,
      article_type,
      slug
    ) VALUES (
      COALESCE(p_article_data->>'title', 'Untitled Draft'),
      COALESCE(p_article_data->>'content', ''),
      p_article_data->>'excerpt',
      p_article_data->>'imageUrl',
      (p_article_data->>'categoryId')::UUID,
      v_author_id,
      'draft',
      COALESCE(v_article_type, 'standard'),
      COALESCE(p_article_data->>'slug', 'draft-' || floor(extract(epoch from now()))::text)
    )
    RETURNING id INTO v_result_id;
  ELSE
    -- Update existing article
    UPDATE articles
    SET
      title = COALESCE(p_article_data->>'title', title),
      content = COALESCE(p_article_data->>'content', content),
      excerpt = COALESCE(p_article_data->>'excerpt', excerpt),
      cover_image = COALESCE(p_article_data->>'imageUrl', cover_image),
      category_id = COALESCE((p_article_data->>'categoryId')::UUID, category_id),
      updated_at = now()
    WHERE id = v_article_id
    RETURNING id INTO v_result_id;
  END IF;
  
  -- Handle video article data in same transaction
  IF v_article_type = 'video' AND p_article_data->>'videoUrl' IS NOT NULL THEN
    -- Upsert video details
    INSERT INTO video_articles (article_id, video_url)
    VALUES (v_result_id, p_article_data->>'videoUrl')
    ON CONFLICT (article_id) 
    DO UPDATE SET video_url = EXCLUDED.video_url;
  END IF;
  
  -- Handle debate article data in same transaction
  IF v_article_type = 'debate' AND p_article_data->'debateSettings' IS NOT NULL THEN
    -- Upsert debate details
    INSERT INTO debate_articles (
      article_id, 
      question, 
      yes_position, 
      no_position, 
      voting_enabled
    )
    VALUES (
      v_result_id,
      p_article_data->'debateSettings'->>'question',
      p_article_data->'debateSettings'->>'yesPosition',
      p_article_data->'debateSettings'->>'noPosition',
      COALESCE((p_article_data->'debateSettings'->>'votingEnabled')::BOOLEAN, true)
    )
    ON CONFLICT (article_id) 
    DO UPDATE SET 
      question = EXCLUDED.question,
      yes_position = EXCLUDED.yes_position,
      no_position = EXCLUDED.no_position,
      voting_enabled = EXCLUDED.voting_enabled;
  END IF;
  
  RETURN v_result_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_draft_optimized(p_user_id uuid, p_article_data jsonb)
 RETURNS TABLE(success boolean, error_message text, article_id uuid, duration_ms integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_article_id UUID;
  v_author_id UUID;
  v_article_type TEXT;
  v_article_title TEXT;
  v_result_id UUID;
  v_existing_article_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_duration_ms INTEGER;
BEGIN
  -- Start timing the function execution
  v_start_time := clock_timestamp();
  
  -- Extract data from the input once to avoid repeated parsing
  v_article_id := (p_article_data->>'id')::UUID;
  v_author_id := COALESCE((p_article_data->>'author_id')::UUID, p_user_id);
  v_article_type := COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', 'standard');
  v_article_title := p_article_data->>'title';
  
  -- OPTIMIZATION: Check for duplicate drafts if no ID is provided in a single query
  IF v_article_id IS NULL AND v_article_title IS NOT NULL AND v_author_id IS NOT NULL THEN
    -- Try to find existing draft with same title and author
    SELECT id INTO v_existing_article_id
    FROM articles
    WHERE 
      title = v_article_title 
      AND author_id = v_author_id
      AND status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Use existing article id if found to prevent duplicates
    IF v_existing_article_id IS NOT NULL THEN
      v_article_id := v_existing_article_id;
    END IF;
  END IF;
  
  -- Handle insert or update based on whether article exists
  IF v_article_id IS NULL THEN
    -- Insert new article with proper field mapping
    INSERT INTO articles (
      title,
      content,
      excerpt,
      cover_image,
      category_id,
      author_id,
      status,
      article_type,
      slug
    ) VALUES (
      COALESCE(v_article_title, 'Untitled Draft'),
      COALESCE(p_article_data->>'content', ''),
      p_article_data->>'excerpt',
      COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl'),
      COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID),
      v_author_id,
      'draft',
      v_article_type,
      COALESCE(p_article_data->>'slug', 'draft-' || floor(extract(epoch from now()))::text)
    )
    RETURNING id INTO v_result_id;
  ELSE
    -- Update existing article with proper field mapping
    UPDATE articles
    SET
      title = COALESCE(p_article_data->>'title', title),
      content = COALESCE(p_article_data->>'content', content),
      excerpt = COALESCE(p_article_data->>'excerpt', excerpt),
      cover_image = COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl', cover_image),
      category_id = COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID, category_id),
      article_type = COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', article_type),
      updated_at = now()
    WHERE id = v_article_id
    RETURNING id INTO v_result_id;
  END IF;
  
  -- Handle video article data in same transaction
  IF v_article_type = 'video' AND p_article_data->>'videoUrl' IS NOT NULL THEN
    -- Upsert video details
    INSERT INTO video_articles (article_id, video_url)
    VALUES (v_result_id, p_article_data->>'videoUrl')
    ON CONFLICT (article_id) 
    DO UPDATE SET video_url = EXCLUDED.video_url;
  END IF;
  
  -- Handle debate article data in same transaction with proper field mapping
  IF v_article_type = 'debate' AND p_article_data->'debateSettings' IS NOT NULL THEN
    -- Upsert debate details
    INSERT INTO debate_articles (
      article_id, 
      question, 
      yes_position, 
      no_position, 
      voting_enabled
    )
    VALUES (
      v_result_id,
      COALESCE(p_article_data->'debateSettings'->>'question', p_article_data->>'title'),
      p_article_data->'debateSettings'->>'yesPosition',
      p_article_data->'debateSettings'->>'noPosition',
      COALESCE((p_article_data->'debateSettings'->>'votingEnabled')::BOOLEAN, true)
    )
    ON CONFLICT (article_id) 
    DO UPDATE SET 
      question = EXCLUDED.question,
      yes_position = EXCLUDED.yes_position,
      no_position = EXCLUDED.no_position,
      voting_enabled = EXCLUDED.voting_enabled;
  END IF;
  
  -- Calculate execution time
  v_end_time := clock_timestamp();
  v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
  
  -- Return success with performance metrics
  RETURN QUERY SELECT true, NULL::TEXT, v_result_id, v_duration_ms;
  
EXCEPTION WHEN OTHERS THEN
  -- Handle errors with performance metrics
  v_end_time := clock_timestamp();
  v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
  RETURN QUERY SELECT false, SQLERRM, NULL::UUID, v_duration_ms;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_confirmation_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  supabase_url text;
  service_key text;
  config_validation json;
  request_id bigint;
  http_response net.http_response_result;
  error_message text;
  event_id uuid;
BEGIN
  -- Log trigger attempt
  event_id := log_trigger_email_event(
    'trigger_attempt',
    NEW.parent_email,
    'invitation_confirmation',
    'database_trigger',
    true,
    NULL,
    jsonb_build_object(
      'invitation_id', NEW.id::text,
      'trigger_event', 'INSERT',
      'timestamp', NOW()
    )
  );

  -- Validate configuration before proceeding
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    error_message := 'Email system configuration is invalid';
    
    PERFORM log_trigger_email_event(
      'failed',
      NEW.parent_email,
      'invitation_confirmation',
      'database_trigger',
      false,
      error_message,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'error_type', 'configuration',
        'config_validation', config_validation
      )
    );
    
    -- Don't fail the transaction, just log the issue
    RETURN NEW;
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Attempt to send email via Edge Function
  BEGIN
    -- Log sending attempt
    PERFORM log_trigger_email_event(
      'sending',
      NEW.parent_email,
      'invitation_confirmation',
      'pg_net',
      true,
      NULL,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'url', supabase_url || '/functions/v1/send-email'
      )
    );

    -- Make HTTP request to Edge Function
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'database_trigger'
      ),
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', NEW.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(NEW.parent_name, 'Parent'),
          'childName', COALESCE(NEW.child_name, 'Child'),
          'submissionDate', to_char(NEW.created_at, 'Month DD, YYYY'),
          'invitationId', NEW.id::text
        )
      )
    ) INTO request_id;

    -- Collect the response
    SELECT net.http_collect_response(request_id, async := false) INTO http_response;

    -- Check response using correct field name 'status' not 'status_code'
    IF http_response.status BETWEEN 200 AND 299 THEN
      -- Success
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = NEW.id;
      
      PERFORM log_trigger_email_event(
        'sent',
        NEW.parent_email,
        'invitation_confirmation',
        'pg_net',
        true,
        NULL,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'status', http_response.status,
          'response_body', http_response.content
        )
      );
    ELSE
      -- HTTP error
      error_message := 'Edge Function returned error status: ' || http_response.status::text;
      
      PERFORM log_trigger_email_event(
        'failed',
        NEW.parent_email,
        'invitation_confirmation',
        'pg_net',
        false,
        error_message,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'status', http_response.status,
          'response_body', http_response.content,
          'error_type', 'http_error'
        )
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Network or other error
    error_message := 'Failed to call Edge Function: ' || SQLERRM;
    
    PERFORM log_trigger_email_event(
      'failed',
      NEW.parent_email,
      'invitation_confirmation',
      'pg_net',
      false,
      error_message,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE,
        'error_type', 'exception'
      )
    );
  END;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_confirmation_email_rpc(invitation_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  invitation_record record;
  supabase_url text;
  service_key text;
  config_validation json;
  http_response record;
  error_message text;
  event_id uuid;
BEGIN
  -- Input parameter validation
  IF invitation_id_param IS NULL THEN
    PERFORM log_email_event(
      'failed',
      'unknown',
      'invitation_confirmation',
      NULL,
      'Invalid input: invitation_id_param is null',
      jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'validation')
    );
    RETURN json_build_object(
      'success', false, 
      'error', 'invalid_input',
      'message', 'Invitation ID parameter is required'
    );
  END IF;

  -- Log RPC call attempt
  PERFORM log_email_event(
    'rpc_attempt',
    'unknown',
    'invitation_confirmation',
    NULL,
    NULL,
    jsonb_build_object(
      'function', 'send_confirmation_email_rpc',
      'invitation_id', invitation_id_param::text,
      'timestamp', NOW()
    )
  );

  -- Validate configuration before proceeding
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    error_message := 'Email system configuration is invalid: ' || 
                    CASE 
                      WHEN NOT (config_validation->>'supabase_url_configured')::boolean THEN 'Supabase URL not configured'
                      WHEN NOT (config_validation->>'service_key_configured')::boolean THEN 'Service role key not configured'
                      ELSE 'Unknown configuration issue'
                    END;
    
    PERFORM log_email_event(
      'failed',
      'unknown',
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'error_type', 'configuration',
        'config_validation', config_validation
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'configuration_invalid',
      'message', error_message,
      'config_details', config_validation
    );
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Get invitation data with validation
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    error_message := 'Invitation request not found for ID: ' || invitation_id_param::text;
    
    PERFORM log_email_event(
      'failed',
      'unknown',
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'error_type', 'not_found',
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'invitation_not_found',
      'message', error_message
    );
  END IF;

  -- Validate invitation record has required fields
  IF invitation_record.parent_email IS NULL OR invitation_record.parent_email = '' THEN
    error_message := 'Invitation record missing required parent_email field';
    
    PERFORM log_email_event(
      'failed',
      COALESCE(invitation_record.parent_email, 'unknown'),
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'error_type', 'invalid_data',
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_invitation_data',
      'message', error_message
    );
  END IF;

  -- Check if confirmation email was already sent recently (within last hour)
  IF invitation_record.confirmation_email_sent_at IS NOT NULL AND 
     invitation_record.confirmation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
    
    PERFORM log_email_event(
      'skipped',
      invitation_record.parent_email,
      'invitation_confirmation',
      NULL,
      'Confirmation email already sent recently',
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'last_sent', invitation_record.confirmation_email_sent_at,
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Confirmation email already sent recently',
      'last_sent_at', invitation_record.confirmation_email_sent_at,
      'skipped', true
    );
  END IF;

  -- Attempt to call Edge Function using pg_net
  BEGIN
    -- Log the attempt
    PERFORM log_email_event(
      'sending',
      invitation_record.parent_email,
      'invitation_confirmation',
      NULL,
      NULL,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'method', 'pg_net',
        'url', supabase_url || '/functions/v1/send-email',
        'invitation_id', invitation_id_param::text
      )
    );

    -- Make HTTP request to Edge Function
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'rpc_function'
      ),
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', invitation_record.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
          'childName', COALESCE(invitation_record.child_name, 'Child'),
          'submissionDate', to_char(invitation_record.created_at, 'Month DD, YYYY'),
          'invitationId', invitation_id_param::text
        )
      )
    );

    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      event_id := log_email_event(
        'sent',
        invitation_record.parent_email,
        'invitation_confirmation',
        'rpc_' || invitation_id_param::text,
        NULL,
        jsonb_build_object(
          'function', 'send_confirmation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', true,
        'message', 'Confirmation email sent successfully',
        'method', 'pg_net',
        'event_id', event_id,
        'sent_at', NOW()
      );
    ELSE
      -- HTTP error - log and return error
      error_message := 'Edge Function returned error status: ' || http_response.status_code::text;
      
      PERFORM log_email_event(
        'failed',
        invitation_record.parent_email,
        'invitation_confirmation',
        NULL,
        error_message,
        jsonb_build_object(
          'function', 'send_confirmation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'error_type', 'http_error',
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', false,
        'error', 'edge_function_error',
        'message', error_message,
        'status_code', http_response.status_code,
        'response_body', http_response.content
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Handle any exceptions (pg_net not available, network errors, etc.)
    error_message := 'Failed to call Edge Function: ' || SQLERRM;
    
    PERFORM log_email_event(
      'failed',
      invitation_record.parent_email,
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'method', 'pg_net',
        'error_type', 'exception',
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE,
        'invitation_id', invitation_id_param::text,
        'fallback_needed', true
      )
    );
    
    -- Update timestamp anyway to prevent repeated attempts
    UPDATE invitation_requests 
    SET confirmation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', false,
      'error', 'network_error',
      'message', error_message,
      'fallback_required', true,
      'sql_error', SQLERRM
    );
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_confirmation_email_simple()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Simply update the timestamp to indicate that email sending is needed
  -- The client-side code will handle the actual email sending
  NEW.confirmation_email_sent_at = NULL; -- Ensure it's null so client knows to send
  
  -- Log that we need client-side email sending
  INSERT INTO email_events (type, email, template, message_id, error, metadata)
  VALUES (
    'trigger_delegated',
    NEW.parent_email,
    'invitation_confirmation',
    'trigger_' || gen_random_uuid()::text,
    'Delegated to client-side fallback',
    jsonb_build_object(
      'invitation_id', NEW.id::text,
      'method', 'database_trigger_simple',
      'requires_client_fallback', true,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_invitation_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only send invitation email when status changes to 'approved'
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Call the unified send-email Edge Function with 'invitation_approved' type
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
          'X-Function-Source', 'database_trigger'
        ),
        body := jsonb_build_object(
          'type', 'invitation_approved',
          'to', NEW.parent_email,
          'templateData', jsonb_build_object(
            'parentName', COALESCE(NEW.parent_name, 'Parent'),
            'childName', COALESCE(NEW.child_name, 'Child'),
            'invitationId', NEW.id::text
          )
        )
      );
    
    -- Update the invitation email timestamp
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_invitation_email_rpc(invitation_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  invitation_record record;
  supabase_url text;
  service_key text;
  config_validation json;
  http_response record;
  error_message text;
  event_id uuid;
BEGIN
  -- Input parameter validation
  IF invitation_id_param IS NULL THEN
    PERFORM log_email_event(
      'failed',
      'unknown',
      'invitation_approved',
      NULL,
      'Invalid input: invitation_id_param is null',
      jsonb_build_object('function', 'send_invitation_email_rpc', 'error_type', 'validation')
    );
    RETURN json_build_object(
      'success', false, 
      'error', 'invalid_input',
      'message', 'Invitation ID parameter is required'
    );
  END IF;

  -- Log RPC call attempt
  PERFORM log_email_event(
    'rpc_attempt',
    'unknown',
    'invitation_approved',
    NULL,
    NULL,
    jsonb_build_object(
      'function', 'send_invitation_email_rpc',
      'invitation_id', invitation_id_param::text,
      'timestamp', NOW()
    )
  );

  -- Validate configuration before proceeding
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    error_message := 'Email system configuration is invalid: ' || 
                    CASE 
                      WHEN NOT (config_validation->>'supabase_url_configured')::boolean THEN 'Supabase URL not configured'
                      WHEN NOT (config_validation->>'service_key_configured')::boolean THEN 'Service role key not configured'
                      ELSE 'Unknown configuration issue'
                    END;
    
    PERFORM log_email_event(
      'failed',
      'unknown',
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'error_type', 'configuration',
        'config_validation', config_validation
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'configuration_invalid',
      'message', error_message,
      'config_details', config_validation
    );
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Get invitation data with validation
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    error_message := 'Invitation request not found for ID: ' || invitation_id_param::text;
    
    PERFORM log_email_event(
      'failed',
      'unknown',
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'error_type', 'not_found',
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'invitation_not_found',
      'message', error_message
    );
  END IF;

  -- Validate invitation status
  IF invitation_record.status != 'approved' THEN
    error_message := 'Invitation must be approved before sending invitation email. Current status: ' || 
                    COALESCE(invitation_record.status, 'null');
    
    PERFORM log_email_event(
      'failed',
      COALESCE(invitation_record.parent_email, 'unknown'),
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'error_type', 'invalid_status',
        'current_status', invitation_record.status,
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'invalid_status',
      'message', error_message,
      'current_status', invitation_record.status
    );
  END IF;

  -- Validate invitation record has required fields
  IF invitation_record.parent_email IS NULL OR invitation_record.parent_email = '' THEN
    error_message := 'Invitation record missing required parent_email field';
    
    PERFORM log_email_event(
      'failed',
      COALESCE(invitation_record.parent_email, 'unknown'),
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'error_type', 'invalid_data',
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_invitation_data',
      'message', error_message
    );
  END IF;

  -- Check if invitation email was already sent recently (within last hour)
  IF invitation_record.invitation_email_sent_at IS NOT NULL AND 
     invitation_record.invitation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
    
    PERFORM log_email_event(
      'skipped',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      'Invitation email already sent recently',
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'last_sent', invitation_record.invitation_email_sent_at,
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Invitation email already sent recently',
      'last_sent_at', invitation_record.invitation_email_sent_at,
      'skipped', true
    );
  END IF;

  -- Attempt to call Edge Function using pg_net
  BEGIN
    -- Log the attempt
    PERFORM log_email_event(
      'sending',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      NULL,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'method', 'pg_net',
        'url', supabase_url || '/functions/v1/send-invitation-approved',
        'invitation_id', invitation_id_param::text
      )
    );

    -- Make HTTP request to Edge Function
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-invitation-approved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'rpc_function'
      ),
      body := jsonb_build_object(
        'invitationId', invitation_id_param::text,
        'parentEmail', invitation_record.parent_email,
        'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
        'childName', COALESCE(invitation_record.child_name, 'Child')
      )
    );

    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET invitation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      event_id := log_email_event(
        'sent',
        invitation_record.parent_email,
        'invitation_approved',
        'rpc_' || invitation_id_param::text,
        NULL,
        jsonb_build_object(
          'function', 'send_invitation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', true,
        'message', 'Invitation email sent successfully',
        'method', 'pg_net',
        'event_id', event_id,
        'sent_at', NOW()
      );
    ELSE
      -- HTTP error - log and return error
      error_message := 'Edge Function returned error status: ' || http_response.status_code::text;
      
      PERFORM log_email_event(
        'failed',
        invitation_record.parent_email,
        'invitation_approved',
        NULL,
        error_message,
        jsonb_build_object(
          'function', 'send_invitation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'error_type', 'http_error',
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', false,
        'error', 'edge_function_error',
        'message', error_message,
        'status_code', http_response.status_code,
        'response_body', http_response.content
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Handle any exceptions (pg_net not available, network errors, etc.)
    error_message := 'Failed to call Edge Function: ' || SQLERRM;
    
    PERFORM log_email_event(
      'failed',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'method', 'pg_net',
        'error_type', 'exception',
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE,
        'invitation_id', invitation_id_param::text,
        'fallback_needed', true
      )
    );
    
    -- Update timestamp anyway to prevent repeated attempts
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', false,
      'error', 'network_error',
      'message', error_message,
      'fallback_required', true,
      'sql_error', SQLERRM
    );
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_invitation_email_simple()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Simply update the timestamp to indicate that email sending is needed
    NEW.invitation_email_sent_at = NULL; -- Ensure it's null so client knows to send
    
    -- Log that we need client-side email sending
    INSERT INTO email_events (type, email, template, message_id, error, metadata)
    VALUES (
      'trigger_delegated',
      NEW.parent_email,
      'invitation_approved',
      'trigger_' || gen_random_uuid()::text,
      'Delegated to client-side fallback',
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'method', 'database_trigger_simple',
        'requires_client_fallback', true,
        'status_change', COALESCE(OLD.status, 'null') || ' -> ' || NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_article_for_review(p_article_id uuid, p_user_id uuid)
 RETURNS TABLE(success boolean, error_message text, article_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_article_exists BOOLEAN;
  v_is_author BOOLEAN;
  v_article_status TEXT;
  v_slug TEXT;
  v_article_title TEXT;
BEGIN
  -- Check if article exists
  SELECT EXISTS(
    SELECT 1 FROM articles WHERE id = p_article_id
  ) INTO v_article_exists;
  
  IF NOT v_article_exists THEN
    RETURN QUERY SELECT false, 'Article not found', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get article status and title
  SELECT 
    status, 
    title,
    author_id = p_user_id
  INTO 
    v_article_status, 
    v_article_title,
    v_is_author
  FROM articles 
  WHERE id = p_article_id;
  
  -- Verify author ownership
  IF NOT v_is_author THEN
    RETURN QUERY SELECT false, 'You do not have permission to submit this article', NULL::UUID;
    RETURN;
  END IF;
  
  -- Skip if already pending
  IF v_article_status = 'pending' THEN
    RETURN QUERY SELECT true, NULL::TEXT, p_article_id;
    RETURN;
  END IF;
  
  -- Start a transaction
  BEGIN
    -- Update slug if missing
    SELECT slug INTO v_slug FROM articles WHERE id = p_article_id;
    
    IF v_slug IS NULL OR v_slug = '' THEN
      -- Generate a basic slug with timestamp for uniqueness
      v_slug := lower(regexp_replace(v_article_title, '[^\w\s]', '', 'g'));
      v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
      v_slug := regexp_replace(v_slug, '-+', '-', 'g');
      v_slug := trim(v_slug) || '-' || floor(extract(epoch from now()))::text;
      
      UPDATE articles 
      SET slug = v_slug 
      WHERE id = p_article_id;
    END IF;
    
    -- Update missing fields and status in a single operation
    UPDATE articles
    SET 
      status = 'pending',
      author_id = COALESCE(author_id, p_user_id),
      updated_at = now()
    WHERE id = p_article_id;
    
    -- Success
    RETURN QUERY SELECT true, NULL::TEXT, p_article_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    RETURN QUERY SELECT false, SQLERRM, NULL::UUID;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_article_optimized(p_user_id uuid, p_article_data jsonb, p_save_draft boolean DEFAULT true)
 RETURNS TABLE(success boolean, error_message text, article_id uuid, duration_ms integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_article_id UUID;
  v_article_exists BOOLEAN;
  v_is_author BOOLEAN;
  v_article_status TEXT;
  v_author_id UUID;
  v_article_type TEXT;
  v_article_title TEXT;
  v_slug TEXT;
  v_result_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_duration_ms INTEGER;
BEGIN
  -- Start timing the function execution
  v_start_time := clock_timestamp();
  
  -- Extract data from the input once to avoid repeated JSON parsing
  v_article_id := (p_article_data->>'id')::UUID;
  v_author_id := COALESCE((p_article_data->>'author_id')::UUID, p_user_id);
  v_article_type := COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', 'standard');
  v_article_title := p_article_data->>'title';
  v_slug := p_article_data->>'slug';
  
  -- Start a transaction for atomic operations
  BEGIN
    -- OPTIMIZATION: Combine permission and existence check in a single query
    IF v_article_id IS NOT NULL THEN
      SELECT 
        EXISTS(SELECT 1 FROM articles WHERE id = v_article_id),
        (author_id = p_user_id),
        status
      INTO 
        v_article_exists,
        v_is_author,
        v_article_status
      FROM articles 
      WHERE id = v_article_id;
      
      -- Verify article exists
      IF NOT v_article_exists THEN
        v_end_time := clock_timestamp();
        v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
        RETURN QUERY SELECT false, 'Article not found', NULL::UUID, v_duration_ms;
        RETURN;
      END IF;
      
      -- Verify author ownership
      IF NOT v_is_author THEN
        v_end_time := clock_timestamp();
        v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
        RETURN QUERY SELECT false, 'You do not have permission to submit this article', NULL::UUID, v_duration_ms;
        RETURN;
      END IF;
      
      -- Skip processing if already pending
      IF v_article_status = 'pending' THEN
        v_end_time := clock_timestamp();
        v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
        RETURN QUERY SELECT true, NULL::TEXT, v_article_id, v_duration_ms;
        RETURN;
      END IF;
      
      -- OPTIMIZATION: Update article inline with proper field mapping
      UPDATE articles
      SET
        title = COALESCE(p_article_data->>'title', title),
        content = COALESCE(p_article_data->>'content', content),
        excerpt = COALESCE(p_article_data->>'excerpt', excerpt),
        cover_image = COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl', cover_image),
        category_id = COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID, category_id),
        status = 'pending',
        article_type = COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', article_type),
        updated_at = now()
      WHERE id = v_article_id
      RETURNING id INTO v_result_id;
      
    ELSE
      -- OPTIMIZATION: Direct insert for new articles with proper field mapping
      INSERT INTO articles (
        title,
        content,
        excerpt,
        cover_image,
        category_id,
        author_id,
        status,
        article_type,
        slug
      ) VALUES (
        COALESCE(v_article_title, 'Untitled Article'),
        COALESCE(p_article_data->>'content', ''),
        p_article_data->>'excerpt',
        COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl'),
        COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID),
        v_author_id,
        'pending',
        v_article_type,
        COALESCE(v_slug, 'article-' || floor(extract(epoch from now()))::text)
      )
      RETURNING id INTO v_result_id;
    END IF;
    
    -- OPTIMIZATION: Handle article type specific data in the same transaction
    -- Handle video article data
    IF v_article_type = 'video' AND p_article_data->>'videoUrl' IS NOT NULL THEN
      INSERT INTO video_articles (article_id, video_url)
      VALUES (v_result_id, p_article_data->>'videoUrl')
      ON CONFLICT (article_id) 
      DO UPDATE SET video_url = EXCLUDED.video_url;
    END IF;
    
    -- Handle debate article data with proper field mapping
    IF v_article_type = 'debate' AND p_article_data->'debateSettings' IS NOT NULL THEN
      INSERT INTO debate_articles (
        article_id, 
        question, 
        yes_position, 
        no_position, 
        voting_enabled
      )
      VALUES (
        v_result_id,
        COALESCE(p_article_data->'debateSettings'->>'question', p_article_data->>'title'),
        p_article_data->'debateSettings'->>'yesPosition',
        p_article_data->'debateSettings'->>'noPosition',
        COALESCE((p_article_data->'debateSettings'->>'votingEnabled')::BOOLEAN, true)
      )
      ON CONFLICT (article_id) 
      DO UPDATE SET 
        question = EXCLUDED.question,
        yes_position = EXCLUDED.yes_position,
        no_position = EXCLUDED.no_position,
        voting_enabled = EXCLUDED.voting_enabled;
    END IF;
    
    -- Calculate execution time
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    
    -- Success
    RETURN QUERY SELECT true, NULL::TEXT, v_result_id, v_duration_ms;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    RETURN QUERY SELECT false, SQLERRM, NULL::UUID, v_duration_ms;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_article_with_validation(p_user_id uuid, p_article_data jsonb, p_save_draft boolean DEFAULT true)
 RETURNS TABLE(success boolean, error_message text, article_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_article_id UUID;
  v_article_exists BOOLEAN;
  v_is_author BOOLEAN;
  v_article_status TEXT;
  v_article_type TEXT;
  v_article_title TEXT;
  v_slug TEXT;
BEGIN
  -- Extract data from the input
  v_article_id := (p_article_data->>'id')::UUID;
  v_article_type := p_article_data->>'articleType';
  v_article_title := p_article_data->>'title';
  v_slug := p_article_data->>'slug';
  
  -- Start a transaction for atomic operations
  BEGIN
    -- If article exists, check if user has permission
    IF v_article_id IS NOT NULL THEN
      SELECT 
        EXISTS(SELECT 1 FROM articles WHERE id = v_article_id),
        (author_id = p_user_id),
        status
      INTO 
        v_article_exists,
        v_is_author,
        v_article_status
      FROM articles 
      WHERE id = v_article_id;
      
      -- Verify article exists
      IF NOT v_article_exists THEN
        RETURN QUERY SELECT false, 'Article not found', NULL::UUID;
        RETURN;
      END IF;
      
      -- Verify author ownership
      IF NOT v_is_author THEN
        RETURN QUERY SELECT false, 'You do not have permission to submit this article', NULL::UUID;
        RETURN;
      END IF;
      
      -- Skip if already pending
      IF v_article_status = 'pending' THEN
        RETURN QUERY SELECT true, NULL::TEXT, v_article_id;
        RETURN;
      END IF;
    END IF;
    
    -- If saving as draft first
    IF p_save_draft THEN
      -- Save article draft
      v_article_id := save_article_draft(p_article_data);
      
      -- Check if draft was saved successfully
      IF v_article_id IS NULL THEN
        RETURN QUERY SELECT false, 'Failed to save article draft', NULL::UUID;
        RETURN;
      END IF;
    END IF;
    
    -- Update status to pending in one operation
    UPDATE articles
    SET 
      status = 'pending',
      updated_at = now()
    WHERE id = v_article_id;
    
    -- Success
    RETURN QUERY SELECT true, NULL::TEXT, v_article_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    RETURN QUERY SELECT false, SQLERRM, NULL::UUID;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.system_health_check()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
  config_check json;
  connectivity_check json;
  db_check json;
  overall_status text := 'healthy';
BEGIN
  -- Database connectivity check
  BEGIN
    PERFORM 1;
    db_check := json_build_object(
      'status', 'pass',
      'message', 'Database connection healthy'
    );
  EXCEPTION WHEN OTHERS THEN
    db_check := json_build_object(
      'status', 'fail',
      'message', 'Database connection failed: ' || SQLERRM
    );
    overall_status := 'unhealthy';
  END;
  
  -- Configuration validation check
  config_check := validate_system_configuration();
  IF NOT (config_check->>'is_valid')::boolean THEN
    overall_status := 'unhealthy';
  END IF;
  
  -- Edge Function connectivity check
  connectivity_check := test_edge_function_connectivity();
  IF NOT (connectivity_check->>'success')::boolean THEN
    IF overall_status = 'healthy' THEN
      overall_status := 'degraded';
    END IF;
  END IF;
  
  -- Build comprehensive result
  result := json_build_object(
    'status', overall_status,
    'timestamp', now(),
    'checks', json_build_object(
      'database', db_check,
      'configuration', config_check,
      'edge_functions', connectivity_check
    )
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_data_loading_independence()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT jsonb_build_object(
    'published_articles_count', (SELECT COUNT(*) FROM public.articles WHERE status = 'published'),
    'categories_count', (SELECT COUNT(*) FROM public.categories),
    'profiles_accessible', (SELECT COUNT(*) FROM public.profiles) > 0,
    'helper_functions_working', (
      SELECT jsonb_build_object(
        'is_admin_callable', (SELECT is_admin() IS NOT NULL),
        'is_moderator_or_admin_callable', (SELECT is_moderator_or_admin() IS NOT NULL)
      )
    ),
    'timestamp', now()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.test_edge_function_connectivity()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
  service_role_key text;
  response_status int;
  error_message text;
BEGIN
  -- Get service role key
  BEGIN
    service_role_key := get_validated_config('supabase_service_role_key');
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to get service role key: ' || SQLERRM,
      'tested_at', now()
    );
  END;
  
  -- Test Edge Function connectivity using pg_net if available
  BEGIN
    -- This is a simplified test - in production you might want to use pg_net
    -- For now, we'll just validate that we have the required configuration
    result := json_build_object(
      'success', true,
      'message', 'Configuration validated for Edge Function connectivity',
      'service_role_key_valid', validate_service_role_key_format(service_role_key),
      'tested_at', now()
    );
  EXCEPTION WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'tested_at', now()
    );
  END;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_pg_net_response()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  request_id bigint;
  http_response net.http_response_result;
  result jsonb;
BEGIN
  -- Make a simple test request
  SELECT net.http_get('https://httpbin.org/status/200') INTO request_id;
  SELECT net.http_collect_response(request_id, async := false) INTO http_response;
  
  -- Return the response structure for debugging
  result := jsonb_build_object(
    'status', http_response.status,
    'content_type', http_response.content_type,
    'content_length', length(http_response.content),
    'has_content', http_response.content IS NOT NULL,
    'response_fields', jsonb_build_object(
      'status_exists', (to_jsonb(http_response) ? 'status'),
      'status_code_exists', (to_jsonb(http_response) ? 'status_code'),
      'content_exists', (to_jsonb(http_response) ? 'content')
    )
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_registration_permissions(test_user_id uuid, test_registration_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result jsonb := '{}';
  context_id uuid;
  can_create boolean;
BEGIN
  -- Test if we can create a registration context
  BEGIN
    context_id := create_registration_context(test_user_id, test_registration_type);
    result := jsonb_set(result, '{context_creation}', 'true');
    result := jsonb_set(result, '{context_id}', to_jsonb(context_id));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{context_creation}', 'false');
    result := jsonb_set(result, '{context_error}', to_jsonb(SQLERRM));
  END;
  
  -- Test if we can check profile creation permissions
  BEGIN
    SELECT can_create_profile_during_registration(test_user_id) INTO can_create;
    result := jsonb_set(result, '{can_create_profile}', to_jsonb(can_create));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{profile_check_error}', to_jsonb(SQLERRM));
  END;
  
  -- Test registration context check
  BEGIN
    SELECT is_registration_context() INTO can_create;
    result := jsonb_set(result, '{is_registration_context}', to_jsonb(can_create));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{context_check_error}', to_jsonb(SQLERRM));
  END;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_rpc_functions()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  config_validation json;
  test_invitation_id uuid;
  confirmation_result json;
  invitation_result json;
  overall_result json;
BEGIN
  -- First validate configuration
  SELECT validate_email_configuration() INTO config_validation;
  
  -- Get a test invitation ID (preferably one that's approved)
  SELECT id INTO test_invitation_id 
  FROM invitation_requests 
  WHERE status = 'approved' 
  LIMIT 1;
  
  IF test_invitation_id IS NULL THEN
    -- Try to get any invitation ID for testing
    SELECT id INTO test_invitation_id 
    FROM invitation_requests 
    LIMIT 1;
  END IF;
  
  -- Build overall result
  overall_result := json_build_object(
    'configuration_valid', (config_validation->>'configuration_valid')::boolean,
    'config_details', config_validation,
    'test_invitation_id', COALESCE(test_invitation_id::text, 'none_available'),
    'timestamp', NOW()
  );
  
  -- If we have a test invitation, try the functions
  IF test_invitation_id IS NOT NULL THEN
    -- Test confirmation email RPC (safe to test multiple times)
    BEGIN
      SELECT send_confirmation_email_rpc(test_invitation_id) INTO confirmation_result;
      overall_result := overall_result || json_build_object('confirmation_test', confirmation_result);
    EXCEPTION WHEN OTHERS THEN
      overall_result := overall_result || json_build_object(
        'confirmation_test', 
        json_build_object('success', false, 'error', SQLERRM)
      );
    END;
    
    -- Only test invitation email RPC if the invitation is approved
    BEGIN
      SELECT send_invitation_email_rpc(test_invitation_id) INTO invitation_result;
      overall_result := overall_result || json_build_object('invitation_test', invitation_result);
    EXCEPTION WHEN OTHERS THEN
      overall_result := overall_result || json_build_object(
        'invitation_test', 
        json_build_object('success', false, 'error', SQLERRM)
      );
    END;
  END IF;
  
  RETURN overall_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_service_role_key(new_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  key_length integer;
BEGIN
  -- Validate the key format (basic validation)
  key_length := length(new_key);
  
  IF key_length < 50 THEN
    RAISE EXCEPTION 'Service role key appears to be too short (length: %)', key_length;
  END IF;
  
  IF new_key NOT LIKE 'eyJ%' THEN
    RAISE EXCEPTION 'Service role key does not appear to be a valid JWT token';
  END IF;
  
  -- Update the configuration
  UPDATE system_configuration 
  SET value = new_key, updated_at = now()
  WHERE key = 'app.service_role_key';
  
  IF NOT FOUND THEN
    INSERT INTO system_configuration (key, value, description)
    VALUES ('app.service_role_key', new_key, 'Service role key for authenticated Edge Function calls');
  END IF;
  
  RAISE NOTICE 'Service role key updated successfully (length: %)', key_length;
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to update service role key: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_service_role_key_validated(new_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
BEGIN
  -- Validate key format first
  IF NOT validate_service_role_key_format(new_key) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid service role key format',
      'updated_at', now()
    );
  END IF;
  
  -- Update the key
  INSERT INTO system_configuration (key, value, description, is_sensitive, updated_at)
  VALUES ('supabase_service_role_key', new_key, 'Supabase service role key for Edge Function authentication', true, now())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
  
  -- Log the update
  INSERT INTO audit_logs (
    table_name,
    operation,
    old_values,
    new_values,
    user_id,
    created_at
  ) VALUES (
    'system_configuration',
    'UPDATE',
    json_build_object('key', 'supabase_service_role_key'),
    json_build_object('key', 'supabase_service_role_key', 'updated', true),
    auth.uid(),
    now()
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Service role key updated successfully',
    'updated_at', now()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_email_configuration()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  supabase_url text;
  service_key text;
  key_validation json;
  result json;
BEGIN
  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');
  
  -- Validate service role key
  key_validation := validate_service_role_key(service_key);
  
  -- Build comprehensive validation result
  result := json_build_object(
    'supabase_url_configured', (supabase_url IS NOT NULL AND supabase_url != ''),
    'supabase_url', CASE WHEN supabase_url IS NOT NULL THEN supabase_url ELSE 'NOT_SET' END,
    'service_key_validation', key_validation,
    'configuration_valid', (
      supabase_url IS NOT NULL AND supabase_url != '' AND
      (key_validation->>'is_valid')::boolean = true
    ),
    'next_steps', CASE 
      WHEN supabase_url IS NULL OR supabase_url = '' THEN 'Set Supabase URL in configuration'
      WHEN (key_validation->>'is_valid')::boolean = false THEN 'Update service role key using update_service_role_key() function'
      ELSE 'Configuration is valid'
    END
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_role_migration()
 RETURNS TABLE(total_users integer, users_with_correct_roles integer, users_needing_fix integer, migration_success_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    total_count INTEGER;
    correct_count INTEGER;
    needs_fix_count INTEGER;
BEGIN
    -- Count total users (excluding admins)
    SELECT COUNT(*) INTO total_count
    FROM profiles 
    WHERE role != 'admin';
    
    -- Count users with correct roles
    SELECT COUNT(*) INTO correct_count
    FROM identify_users_needing_author_role()
    WHERE should_be_author = false OR user_role = 'author';
    
    -- Count users still needing fix
    SELECT COUNT(*) INTO needs_fix_count
    FROM identify_users_needing_author_role()
    WHERE should_be_author = true;
    
    RETURN QUERY SELECT 
        total_count,
        correct_count,
        needs_fix_count,
        CASE 
            WHEN total_count > 0 THEN ROUND((correct_count::NUMERIC / total_count::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_service_role_key(key_to_check text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  service_key text;
  key_length integer;
  is_valid boolean := false;
  validation_result json;
BEGIN
  -- Use provided key or get from configuration
  IF key_to_check IS NOT NULL THEN
    service_key := key_to_check;
  ELSE
    service_key := get_config_setting('app.service_role_key');
  END IF;
  
  -- Validate the key
  IF service_key IS NOT NULL THEN
    key_length := length(service_key);
    is_valid := (
      key_length > 100 AND 
      service_key LIKE 'eyJ%' AND 
      service_key != 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET'
    );
  ELSE
    key_length := 0;
  END IF;
  
  -- Build validation result
  validation_result := json_build_object(
    'key_exists', (service_key IS NOT NULL),
    'key_length', key_length,
    'is_jwt_format', (service_key IS NOT NULL AND service_key LIKE 'eyJ%'),
    'is_placeholder', (service_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET'),
    'is_valid', is_valid,
    'validation_message', CASE 
      WHEN service_key IS NULL THEN 'Service role key not found'
      WHEN service_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN 'Service role key is still placeholder - needs to be updated'
      WHEN key_length < 100 THEN 'Service role key too short'
      WHEN service_key NOT LIKE 'eyJ%' THEN 'Service role key not in JWT format'
      WHEN is_valid THEN 'Service role key is valid'
      ELSE 'Service role key validation failed'
    END
  );
  
  RETURN validation_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_service_role_key_format(key_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if key exists and has proper format
  IF key_value IS NULL OR length(key_value) < 100 THEN
    RETURN false;
  END IF;
  
  -- Check if it starts with JWT format
  IF NOT key_value LIKE 'eyJ%' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_system_configuration()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
  missing_keys text[] := '{}';
  invalid_keys text[] := '{}';
  config_record record;
  required_keys text[] := ARRAY['supabase_service_role_key', 'resend_api_key', 'app_url'];
  key_name text;
BEGIN
  -- Check for missing required keys
  FOREACH key_name IN ARRAY required_keys
  LOOP
    IF NOT EXISTS (SELECT 1 FROM system_configuration WHERE key = key_name) THEN
      missing_keys := array_append(missing_keys, key_name);
    END IF;
  END LOOP;
  
  -- Validate existing keys
  FOR config_record IN 
    SELECT key, value FROM system_configuration 
    WHERE key = ANY(required_keys)
  LOOP
    -- Validate service role key format
    IF config_record.key = 'supabase_service_role_key' THEN
      IF NOT validate_service_role_key_format(config_record.value) THEN
        invalid_keys := array_append(invalid_keys, config_record.key);
      END IF;
    END IF;
    
    -- Validate other keys have values
    IF config_record.value IS NULL OR trim(config_record.value) = '' THEN
      invalid_keys := array_append(invalid_keys, config_record.key);
    END IF;
  END LOOP;
  
  -- Build result
  result := json_build_object(
    'is_valid', array_length(missing_keys, 1) IS NULL AND array_length(invalid_keys, 1) IS NULL,
    'missing_keys', missing_keys,
    'invalid_keys', invalid_keys,
    'checked_at', now()
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_action text, p_resource_type text, p_resource_id text, p_user_email text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_success boolean DEFAULT true, p_error_message text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  audit_id uuid;
BEGIN
  -- Insert audit log entry
  INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    user_email,
    user_id,
    success,
    error_message,
    metadata,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_action,
    p_resource_type,
    p_resource_id,
    p_user_email,
    p_user_id,
    p_success,
    p_error_message,
    COALESCE(p_metadata, '{}'),
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the calling operation
  RAISE WARNING 'Failed to log audit event: %', SQLERRM;
  RETURN gen_random_uuid();
END;
$function$
;

create or replace view "public"."email_system_dashboard" as  SELECT 'current_health'::text AS metric_type,
    get_comprehensive_email_health(24) AS data,
    now() AS last_updated
UNION ALL
 SELECT 'template_metrics'::text AS metric_type,
    get_email_metrics_by_template(24) AS data,
    now() AS last_updated
UNION ALL
 SELECT 'performance_trends'::text AS metric_type,
    get_email_performance_trends(7) AS data,
    now() AS last_updated
UNION ALL
 SELECT 'system_alerts'::text AS metric_type,
    check_email_system_alerts() AS data,
    now() AS last_updated;



  create policy "Achievement types are publicly readable"
  on "public"."achievement_types"
  as permissive
  for select
  to public
using (true);



  create policy "Activities are viewable by everyone"
  on "public"."activities"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can create activities"
  on "public"."activities"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Enable insert for authenticated users only"
  on "public"."activities"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view all activities"
  on "public"."activities"
  as permissive
  for select
  to public
using (true);



  create policy "Admins and moderators can create reviews"
  on "public"."article_reviews"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))));



  create policy "Admins and moderators can update reviews"
  on "public"."article_reviews"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))));



  create policy "Admins and moderators can view all reviews"
  on "public"."article_reviews"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))));



  create policy "Authors can view reviews of their articles"
  on "public"."article_reviews"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = article_reviews.article_id) AND (articles.author_id = auth.uid())))));



  create policy "Service role can manage all reviews"
  on "public"."article_reviews"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "Article revisions can be created by authors and admins"
  on "public"."article_revisions"
  as permissive
  for insert
  to public
with check (((auth.uid() = editor_id) OR is_admin()));



  create policy "Only authors and admins can manage article tags"
  on "public"."article_tags"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = article_tags.article_id) AND ((articles.author_id = auth.uid()) OR is_admin())))));



  create policy "Article views are managed by system"
  on "public"."article_views"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR (user_id IS NULL)));



  create policy "Anyone can view votes"
  on "public"."article_votes"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own votes"
  on "public"."article_votes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own votes"
  on "public"."article_votes"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Admins and moderators can update all articles"
  on "public"."articles"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))))
with check (true);



  create policy "Admins and moderators can view all articles for review"
  on "public"."articles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))));



  create policy "Authors can create articles"
  on "public"."articles"
  as permissive
  for insert
  to public
with check (((auth.uid() = author_id) OR is_admin()));



  create policy "Authors can delete their own draft articles"
  on "public"."articles"
  as permissive
  for delete
  to public
using (((auth.uid() = author_id) AND (status = 'draft'::text)));



  create policy "Authors can update their own articles"
  on "public"."articles"
  as permissive
  for update
  to public
using ((auth.uid() = author_id))
with check ((auth.uid() = author_id));



  create policy "Public access to published articles"
  on "public"."articles"
  as permissive
  for select
  to public
using (((status = 'published'::text) OR (auth.uid() = author_id) OR (auth.role() = 'service_role'::text) OR is_admin()));



  create policy "Service role can delete all articles"
  on "public"."articles"
  as permissive
  for delete
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can update all articles"
  on "public"."articles"
  as permissive
  for update
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Admins can access audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))) OR (auth.role() = 'service_role'::text)));



  create policy "Service role can insert audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check ((auth.role() = 'service_role'::text));



  create policy "Service role can manage audit logs"
  on "public"."audit_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can view their own audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (user_email = auth.email())));



  create policy "Public access to categories"
  on "public"."categories"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage categories"
  on "public"."categories"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can create comment likes"
  on "public"."comment_likes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Anyone can view published comments"
  on "public"."comments"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Authenticated users can create comments"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Published comments are viewable by everyone"
  on "public"."comments"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Users can create comments on published articles"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own comments"
  on "public"."comments"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own comments"
  on "public"."comments"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Service role can manage email events"
  on "public"."email_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can view their own email events"
  on "public"."email_events"
  as permissive
  for select
  to public
using ((email = auth.email()));



  create policy "Authenticated users can view email metrics"
  on "public"."email_metrics"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Service role can manage email metrics"
  on "public"."email_metrics"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can flag content"
  on "public"."flagged_content"
  as permissive
  for insert
  to public
with check ((auth.uid() = reporter_id));



  create policy "Allow access to valid invitation tokens"
  on "public"."invitation_tokens"
  as permissive
  for select
  to public
using (((auth.role() = 'service_role'::text) OR ((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'moderator'::text])))))) OR ((used_at IS NULL) AND (expires_at > now()) AND (EXISTS ( SELECT 1
   FROM invitation_requests
  WHERE ((invitation_requests.id = invitation_tokens.invitation_request_id) AND (invitation_requests.status = 'approved'::text)))))));



  create policy "Service role can manage all tokens"
  on "public"."invitation_tokens"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can manage invitation tokens"
  on "public"."invitation_tokens"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can view their own invitation tokens"
  on "public"."invitation_tokens"
  as permissive
  for select
  to public
using (((email = auth.email()) OR (used_by = auth.uid())));



  create policy "Authenticated users can create media assets"
  on "public"."media_assets"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Everyone can view media assets"
  on "public"."media_assets"
  as permissive
  for select
  to public
using (true);



  create policy "Users can delete their own media assets"
  on "public"."media_assets"
  as permissive
  for delete
  to public
using ((uploader_id = auth.uid()));



  create policy "Users can update their own media assets"
  on "public"."media_assets"
  as permissive
  for update
  to public
using ((uploader_id = auth.uid()));



  create policy "Users can upload media assets"
  on "public"."media_assets"
  as permissive
  for insert
  to public
with check (((auth.uid() = uploader_id) OR is_admin()));



  create policy "Users can insert their own privacy settings"
  on "public"."privacy_settings"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own privacy settings"
  on "public"."privacy_settings"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own privacy settings"
  on "public"."privacy_settings"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Allow profile creation during registration"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check (((auth.role() = 'service_role'::text) OR (auth.uid() = id) OR ((auth.uid() IS NULL) AND (EXISTS ( SELECT 1
   FROM auth.users
  WHERE (users.id = profiles.id))))));



  create policy "Public read access to profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can manage profiles"
  on "public"."profiles"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Service role can manage rate limit attempts"
  on "public"."rate_limit_attempts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can read their own rate limit attempts"
  on "public"."rate_limit_attempts"
  as permissive
  for select
  to public
using ((((auth.uid())::text = identifier) OR (auth.role() = 'service_role'::text)));



  create policy "Service role can manage registration contexts"
  on "public"."registration_contexts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "System can create registration contexts"
  on "public"."registration_contexts"
  as permissive
  for insert
  to public
with check (((auth.role() = 'service_role'::text) OR is_admin()));



  create policy "Users can view own registration contexts"
  on "public"."registration_contexts"
  as permissive
  for select
  to public
using ((((auth.uid())::text = (user_id)::text) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::text, 'moderator'::text])))))));



  create policy "Authors and admins can create storyboard episodes"
  on "public"."storyboard_episodes"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM storyboard_series
  WHERE ((storyboard_series.id = storyboard_episodes.series_id) AND ((storyboard_series.author_id = auth.uid()) OR is_admin())))));



  create policy "Authors can manage episodes of their own series"
  on "public"."storyboard_episodes"
  as permissive
  for all
  to public
using ((series_id IN ( SELECT storyboard_series.id
   FROM storyboard_series
  WHERE (storyboard_series.author_id = auth.uid()))));



  create policy "Everyone can view published storyboard episodes"
  on "public"."storyboard_episodes"
  as permissive
  for select
  to public
using (true);



  create policy "Authors and admins can create storyboard series"
  on "public"."storyboard_series"
  as permissive
  for insert
  to public
with check (((auth.uid() = author_id) OR is_admin()));



  create policy "Authors can manage their own storyboard series"
  on "public"."storyboard_series"
  as permissive
  for all
  to public
using ((author_id = auth.uid()));



  create policy "Everyone can view published storyboard series"
  on "public"."storyboard_series"
  as permissive
  for select
  to public
using ((status = 'active'::text));



  create policy "Service role can manage configuration"
  on "public"."system_configuration"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Only admins can manage tags"
  on "public"."tags"
  as permissive
  for all
  to public
using (is_admin());



  create policy "Tags are viewable by everyone"
  on "public"."tags"
  as permissive
  for select
  to public
using (true);



  create policy "Achievements are viewable if user allows"
  on "public"."user_achievements"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (( SELECT privacy_settings.show_comment_history
   FROM privacy_settings
  WHERE (privacy_settings.user_id = user_achievements.user_id)) = true)));



  create policy "Only admins can create achievements"
  on "public"."user_achievements"
  as permissive
  for insert
  to public
with check (is_admin());



  create policy "Reading stats are viewable if user allows"
  on "public"."user_reading_stats"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (( SELECT privacy_settings.show_reading_activity
   FROM privacy_settings
  WHERE (privacy_settings.user_id = user_reading_stats.user_id)) = true)));



  create policy "System can insert reading stats"
  on "public"."user_reading_stats"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR is_admin()));



  create policy "Users and system can update reading stats"
  on "public"."user_reading_stats"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR is_admin()));



  create policy "Admins can manage all video articles"
  on "public"."video_articles"
  as permissive
  for all
  to public
using (is_admin())
with check (is_admin());



  create policy "Authors and admins can create video articles"
  on "public"."video_articles"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = video_articles.article_id) AND ((articles.author_id = auth.uid()) OR is_admin())))));



  create policy "Authors can delete their own video articles"
  on "public"."video_articles"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = video_articles.article_id) AND (articles.author_id = auth.uid())))));



  create policy "Authors can update their own video articles"
  on "public"."video_articles"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = video_articles.article_id) AND (articles.author_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM articles
  WHERE ((articles.id = video_articles.article_id) AND (articles.author_id = auth.uid())))));



  create policy "Everyone can view video articles"
  on "public"."video_articles"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER on_article_activity AFTER INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION handle_article_activity();

CREATE TRIGGER on_comment_activity AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION handle_comment_activity();

CREATE TRIGGER trigger_send_confirmation_email AFTER INSERT ON public.invitation_requests FOR EACH ROW EXECUTE FUNCTION send_confirmation_email_simple();

CREATE TRIGGER trigger_send_invitation_email AFTER UPDATE ON public.invitation_requests FOR EACH ROW EXECUTE FUNCTION send_invitation_email_simple();

CREATE TRIGGER ensure_invitation_author_role BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION assign_author_role_from_invitation();

CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON public.system_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


