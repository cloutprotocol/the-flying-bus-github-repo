

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


CREATE OR REPLACE FUNCTION "public"."create_storyboard_series"("p_user_id" "uuid", "p_series_data" "jsonb", "p_episodes_data" "jsonb") RETURNS TABLE("success" boolean, "error_message" "text", "series_id" "uuid", "duration_ms" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_storyboard_series"("p_user_id" "uuid", "p_series_data" "jsonb", "p_episodes_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_article_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_article_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_comment_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_comment_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_author_or_above"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('author', 'moderator', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_author_or_above"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_moderator_or_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_moderator_or_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_db_performance"("p_function_name" "text", "p_duration_ms" integer, "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."log_db_performance"("p_function_name" "text", "p_duration_ms" integer, "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_article_draft"("p_article_data" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_article_id UUID;
  v_author_id UUID;
  v_article_type TEXT;
  v_article_title TEXT;
  v_result_id UUID;
  v_existing_article_id UUID;
  v_featured BOOLEAN;
BEGIN
  -- Extract data from the input
  v_article_id := (p_article_data->>'id')::UUID;
  v_author_id := (p_article_data->>'author_id')::UUID;
  v_article_type := COALESCE(p_article_data->>'articleType', p_article_data->>'article_type', 'standard');
  v_article_title := p_article_data->>'title';
  v_featured := COALESCE((p_article_data->>'featured')::BOOLEAN, (p_article_data->>'shouldHighlight')::BOOLEAN, false);
  
  -- Handle featured article constraint - unfeature existing articles if this one is featured
  IF v_featured THEN
    UPDATE articles SET featured = false WHERE featured = true;
  END IF;
  
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
    -- Insert new article with featured field
    INSERT INTO articles (
      title,
      content,
      excerpt,
      cover_image,
      category_id,
      author_id,
      status,
      article_type,
      slug,
      featured
    ) VALUES (
      COALESCE(p_article_data->>'title', 'Untitled Draft'),
      COALESCE(p_article_data->>'content', ''),
      p_article_data->>'excerpt',
      COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl'),
      COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID),
      v_author_id,
      'draft',
      v_article_type,
      COALESCE(p_article_data->>'slug', 'draft-' || floor(extract(epoch from now()))::text),
      v_featured
    )
    RETURNING id INTO v_result_id;
  ELSE
    -- Update existing article with featured field
    UPDATE articles
    SET
      title = COALESCE(p_article_data->>'title', title),
      content = COALESCE(p_article_data->>'content', content),
      excerpt = COALESCE(p_article_data->>'excerpt', excerpt),
      cover_image = COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl', cover_image),
      category_id = COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID, category_id),
      article_type = COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', article_type),
      featured = v_featured,
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
  
  RETURN v_result_id;
END;
$$;


ALTER FUNCTION "public"."save_article_draft"("p_article_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_draft_optimized"("p_user_id" "uuid", "p_article_data" "jsonb") RETURNS TABLE("success" boolean, "error_message" "text", "article_id" "uuid", "duration_ms" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."save_draft_optimized"("p_user_id" "uuid", "p_article_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_article_for_review"("p_article_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("success" boolean, "error_message" "text", "article_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_article_for_review"("p_article_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_article_optimized"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean DEFAULT true) RETURNS TABLE("success" boolean, "error_message" "text", "article_id" "uuid", "duration_ms" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_article_optimized"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_article_with_validation"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean DEFAULT true) RETURNS TABLE("success" boolean, "error_message" "text", "article_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_article_id UUID;
  v_article_exists BOOLEAN;
  v_is_author BOOLEAN;
  v_article_status TEXT;
  v_article_type TEXT;
  v_article_title TEXT;
  v_slug TEXT;
  v_featured BOOLEAN;
BEGIN
  -- Extract data from the input
  v_article_id := (p_article_data->>'id')::UUID;
  v_article_type := COALESCE(p_article_data->>'articleType', p_article_data->>'article_type', 'standard');
  v_article_title := p_article_data->>'title';
  v_slug := p_article_data->>'slug';
  v_featured := COALESCE((p_article_data->>'featured')::BOOLEAN, (p_article_data->>'shouldHighlight')::BOOLEAN, false);
  
  -- Start a transaction for atomic operations
  BEGIN
    -- Handle featured article constraint - unfeature existing articles if this one is featured
    IF v_featured THEN
      UPDATE articles SET featured = false WHERE featured = true;
    END IF;
    
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
      -- Save article draft (this now handles featured field properly)
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
$$;


ALTER FUNCTION "public"."submit_article_with_validation"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievement_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text",
    "category" "text" DEFAULT 'reading'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievement_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "public"."activity_type" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."article_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "article_reviews_status_check" CHECK (("status" = ANY (ARRAY['approved'::"text", 'rejected'::"text", 'changes_requested'::"text"])))
);


ALTER TABLE "public"."article_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."article_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "editor_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "revision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."article_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."article_tags" (
    "article_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."article_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."article_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "ip_address" "text",
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."article_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."article_votes" (
    "article_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vote" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "article_votes_vote_check" CHECK (("vote" = ANY (ARRAY['yes'::"text", 'no'::"text"])))
);


ALTER TABLE "public"."article_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "content" "text" NOT NULL,
    "excerpt" "text",
    "author_id" "uuid",
    "category_id" "uuid" NOT NULL,
    "cover_image" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "article_type" "text" DEFAULT 'standard'::"text" NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    CONSTRAINT "articles_article_type_check" CHECK (("article_type" = ANY (ARRAY['standard'::"text", 'debate'::"text", 'video'::"text", 'storyboard'::"text"]))),
    CONSTRAINT "articles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'published'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_likes" (
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "article_id" "text" NOT NULL,
    CONSTRAINT "comments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'published'::"text", 'rejected'::"text", 'flagged'::"text"])))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debate_articles" (
    "article_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "yes_position" "text" NOT NULL,
    "no_position" "text" NOT NULL,
    "voting_enabled" boolean DEFAULT true NOT NULL,
    "voting_ends_at" timestamp with time zone
);


ALTER TABLE "public"."debate_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flagged_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewer_id" "uuid",
    CONSTRAINT "flagged_content_content_type_check" CHECK (("content_type" = ANY (ARRAY['article'::"text", 'comment'::"text"]))),
    CONSTRAINT "flagged_content_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."flagged_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_name" "text" NOT NULL,
    "parent_email" "text" NOT NULL,
    "child_name" "text" NOT NULL,
    "child_age" integer NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewer_id" "uuid",
    "child_user_id" "uuid",
    CONSTRAINT "invitation_requests_child_age_check" CHECK ((("child_age" >= 8) AND ("child_age" <= 14))),
    CONSTRAINT "invitation_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text"])))
);


ALTER TABLE "public"."invitation_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" integer,
    "width" integer,
    "height" integer,
    "duration" integer,
    "alt_text" "text",
    "uploader_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_assets_file_type_check" CHECK (("file_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'document'::"text", 'audio'::"text"])))
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."performance_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "duration_ms" integer NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "logged_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."performance_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."performance_logs" IS 'Logs function execution times to help identify performance bottlenecks';



CREATE TABLE IF NOT EXISTS "public"."privacy_settings" (
    "user_id" "uuid" NOT NULL,
    "show_comment_history" boolean DEFAULT true NOT NULL,
    "show_reading_activity" boolean DEFAULT true NOT NULL,
    "profile_visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "show_badges" boolean DEFAULT true NOT NULL,
    "show_achievements" boolean DEFAULT true NOT NULL,
    CONSTRAINT "privacy_settings_profile_visibility_check" CHECK (("profile_visibility" = ANY (ARRAY['public'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."privacy_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "crypto_wallet_address" "text",
    "badge_display_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "public_bio" "text",
    "favorite_categories" "text"[],
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['reader'::"text", 'author'::"text", 'moderator'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storyboard_episodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "series_id" "uuid" NOT NULL,
    "article_id" "uuid" NOT NULL,
    "episode_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" DEFAULT 'Untitled Episode'::"text" NOT NULL,
    "description" "text",
    "video_url" "text",
    "thumbnail_url" "text",
    "duration" "text",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'published'::"text"
);


ALTER TABLE "public"."storyboard_episodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storyboard_series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "cover_image" "text",
    "author_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "category_id" "uuid",
    "featured" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "excerpt" "text",
    CONSTRAINT "storyboard_series_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."storyboard_series" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_name" "text" NOT NULL,
    "achieved_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_reading_stats" (
    "user_id" "uuid" NOT NULL,
    "articles_read" integer DEFAULT 0 NOT NULL,
    "reading_streak" integer DEFAULT 0 NOT NULL,
    "last_read_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_reading_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_articles" (
    "article_id" "uuid" NOT NULL,
    "video_url" "text" NOT NULL,
    "video_duration" integer,
    "transcript" "text"
);


ALTER TABLE "public"."video_articles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievement_types"
    ADD CONSTRAINT "achievement_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."article_reviews"
    ADD CONSTRAINT "article_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."article_revisions"
    ADD CONSTRAINT "article_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."article_tags"
    ADD CONSTRAINT "article_tags_pkey" PRIMARY KEY ("article_id", "tag_id");



ALTER TABLE ONLY "public"."article_views"
    ADD CONSTRAINT "article_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."article_votes"
    ADD CONSTRAINT "article_votes_pkey" PRIMARY KEY ("article_id", "user_id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id", "user_id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debate_articles"
    ADD CONSTRAINT "debate_articles_pkey" PRIMARY KEY ("article_id");



ALTER TABLE ONLY "public"."flagged_content"
    ADD CONSTRAINT "flagged_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_requests"
    ADD CONSTRAINT "invitation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_logs"
    ADD CONSTRAINT "performance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_settings"
    ADD CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."storyboard_episodes"
    ADD CONSTRAINT "storyboard_episodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storyboard_episodes"
    ADD CONSTRAINT "storyboard_episodes_series_id_episode_number_key" UNIQUE ("series_id", "episode_number");



ALTER TABLE ONLY "public"."storyboard_series"
    ADD CONSTRAINT "storyboard_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storyboard_series"
    ADD CONSTRAINT "storyboard_series_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_name_key" UNIQUE ("user_id", "achievement_name");



ALTER TABLE ONLY "public"."user_reading_stats"
    ADD CONSTRAINT "user_reading_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."video_articles"
    ADD CONSTRAINT "video_articles_pkey" PRIMARY KEY ("article_id");



CREATE INDEX "activities_created_at_idx" ON "public"."activities" USING "btree" ("created_at" DESC);



CREATE INDEX "activities_entity_type_idx" ON "public"."activities" USING "btree" ("entity_type");



CREATE INDEX "activities_user_id_idx" ON "public"."activities" USING "btree" ("user_id");



CREATE INDEX "idx_activities_user_id" ON "public"."activities" USING "btree" ("user_id");



CREATE INDEX "idx_flagged_content_comment" ON "public"."flagged_content" USING "btree" ("content_id", "content_type");



CREATE INDEX "idx_invitation_requests_created_at" ON "public"."invitation_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invitation_requests_status" ON "public"."invitation_requests" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "on_article_activity" AFTER INSERT OR UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_article_activity"();



CREATE OR REPLACE TRIGGER "on_comment_activity" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_comment_activity"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."article_reviews"
    ADD CONSTRAINT "article_reviews_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_reviews"
    ADD CONSTRAINT "article_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."article_revisions"
    ADD CONSTRAINT "article_revisions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_revisions"
    ADD CONSTRAINT "article_revisions_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."article_tags"
    ADD CONSTRAINT "article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_tags"
    ADD CONSTRAINT "article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_views"
    ADD CONSTRAINT "article_views_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_views"
    ADD CONSTRAINT "article_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."article_votes"
    ADD CONSTRAINT "article_votes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_votes"
    ADD CONSTRAINT "article_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debate_articles"
    ADD CONSTRAINT "debate_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "fk_activities_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flagged_content"
    ADD CONSTRAINT "fk_flagged_content_comments" FOREIGN KEY ("content_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flagged_content"
    ADD CONSTRAINT "flagged_content_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flagged_content"
    ADD CONSTRAINT "flagged_content_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitation_requests"
    ADD CONSTRAINT "invitation_requests_child_user_id_fkey" FOREIGN KEY ("child_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitation_requests"
    ADD CONSTRAINT "invitation_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."privacy_settings"
    ADD CONSTRAINT "privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storyboard_episodes"
    ADD CONSTRAINT "storyboard_episodes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storyboard_episodes"
    ADD CONSTRAINT "storyboard_episodes_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."storyboard_series"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storyboard_series"
    ADD CONSTRAINT "storyboard_series_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."storyboard_series"
    ADD CONSTRAINT "storyboard_series_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reading_stats"
    ADD CONSTRAINT "user_reading_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_articles"
    ADD CONSTRAINT "video_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



CREATE POLICY "Achievement types are publicly readable" ON "public"."achievement_types" FOR SELECT USING (true);



CREATE POLICY "Achievements are viewable if user allows" ON "public"."user_achievements" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (( SELECT "privacy_settings"."show_comment_history"
   FROM "public"."privacy_settings"
  WHERE ("privacy_settings"."user_id" = "user_achievements"."user_id")) = true)));



CREATE POLICY "Activities are viewable by everyone" ON "public"."activities" FOR SELECT USING (true);



CREATE POLICY "Admins can delete invitation requests" ON "public"."invitation_requests" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can manage all profiles" ON "public"."profiles" USING ("public"."is_admin"());



CREATE POLICY "Admins can update invitation requests" ON "public"."invitation_requests" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Admins can view all invitation requests" ON "public"."invitation_requests" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Anyone can view published comments" ON "public"."comments" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "Article reviews are viewable by authors and moderators" ON "public"."article_reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "article_reviews"."article_id") AND (("articles"."author_id" = "auth"."uid"()) OR "public"."is_moderator_or_admin"())))));



CREATE POLICY "Article reviews can be created by moderators" ON "public"."article_reviews" FOR INSERT WITH CHECK ("public"."is_moderator_or_admin"());



CREATE POLICY "Article revisions are viewable by authors and admins" ON "public"."article_revisions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "article_revisions"."article_id") AND (("articles"."author_id" = "auth"."uid"()) OR "public"."is_moderator_or_admin"())))));



CREATE POLICY "Article revisions can be created by authors and admins" ON "public"."article_revisions" FOR INSERT WITH CHECK ((("auth"."uid"() = "editor_id") OR "public"."is_admin"()));



CREATE POLICY "Article tags are viewable by everyone" ON "public"."article_tags" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "article_tags"."article_id") AND ("articles"."status" = 'published'::"text")))) OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Article views are managed by system" ON "public"."article_views" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Article views are viewable by moderators and admins" ON "public"."article_views" FOR SELECT USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Article votes are viewable by everyone" ON "public"."article_votes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "article_votes"."article_id") AND (("articles"."status" = 'published'::"text") OR "public"."is_moderator_or_admin"())))));



CREATE POLICY "Authenticated users can create activities" ON "public"."activities" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create media assets" ON "public"."media_assets" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authors and admins can create storyboard episodes" ON "public"."storyboard_episodes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."storyboard_series"
  WHERE (("storyboard_series"."id" = "storyboard_episodes"."series_id") AND (("storyboard_series"."author_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Authors and admins can create storyboard series" ON "public"."storyboard_series" FOR INSERT WITH CHECK ((("auth"."uid"() = "author_id") OR "public"."is_admin"()));



CREATE POLICY "Authors can create articles" ON "public"."articles" FOR INSERT WITH CHECK ((("auth"."uid"() = "author_id") OR "public"."is_admin"()));



CREATE POLICY "Authors can delete their own draft articles" ON "public"."articles" FOR DELETE USING ((("auth"."uid"() = "author_id") AND ("status" = 'draft'::"text")));



CREATE POLICY "Authors can manage episodes of their own series" ON "public"."storyboard_episodes" USING (("series_id" IN ( SELECT "storyboard_series"."id"
   FROM "public"."storyboard_series"
  WHERE ("storyboard_series"."author_id" = "auth"."uid"()))));



CREATE POLICY "Authors can manage their own storyboard series" ON "public"."storyboard_series" USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Authors can update storyboard episodes" ON "public"."storyboard_episodes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."storyboard_series"
  WHERE (("storyboard_series"."id" = "storyboard_episodes"."series_id") AND (("storyboard_series"."author_id" = "auth"."uid"()) OR "public"."is_moderator_or_admin"())))));



CREATE POLICY "Authors can update their own articles" ON "public"."articles" FOR UPDATE USING ((("auth"."uid"() = "author_id") OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Authors can update their own storyboard series" ON "public"."storyboard_series" FOR UPDATE USING ((("auth"."uid"() = "author_id") OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Categories are viewable by everyone" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Debate articles are viewable by everyone" ON "public"."debate_articles" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "debate_articles"."article_id") AND ("articles"."status" = 'published'::"text")))) OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Everyone can view media assets" ON "public"."media_assets" FOR SELECT USING (true);



CREATE POLICY "Everyone can view published storyboard episodes" ON "public"."storyboard_episodes" FOR SELECT USING (true);



CREATE POLICY "Everyone can view published storyboard series" ON "public"."storyboard_series" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Flagged content is viewable by moderators" ON "public"."flagged_content" FOR SELECT USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Media assets are viewable by everyone for published content" ON "public"."media_assets" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" IN ( SELECT "article_tags"."article_id"
           FROM "public"."article_tags"
          WHERE ("article_tags"."tag_id" = "media_assets"."id"))) AND ("articles"."status" = 'published'::"text")))) OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Moderators and admins can delete any article" ON "public"."articles" FOR DELETE USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Moderators and admins can update any comment" ON "public"."comments" FOR UPDATE USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Moderators and admins can update flagged content" ON "public"."flagged_content" FOR UPDATE USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Moderators can delete comments" ON "public"."comments" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Moderators can update flagged content" ON "public"."flagged_content" FOR UPDATE USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Only admins can create achievements" ON "public"."user_achievements" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Only admins can create profiles" ON "public"."profiles" FOR INSERT WITH CHECK (("public"."is_admin"() OR ("auth"."uid"() = "id")));



CREATE POLICY "Only admins can manage categories" ON "public"."categories" USING ("public"."is_admin"());



CREATE POLICY "Only admins can manage tags" ON "public"."tags" USING ("public"."is_admin"());



CREATE POLICY "Only authors and admins can manage article tags" ON "public"."article_tags" USING ((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "article_tags"."article_id") AND (("articles"."author_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Only moderators and admins can manage debate articles" ON "public"."debate_articles" USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Only moderators and admins can manage video articles" ON "public"."video_articles" USING ("public"."is_moderator_or_admin"());



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public can create invitation requests" ON "public"."invitation_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "Published articles are viewable by everyone" ON "public"."articles" FOR SELECT USING ((("status" = 'published'::"text") OR ("auth"."uid"() = "author_id") OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Published comments are viewable by everyone" ON "public"."comments" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "Reading stats are viewable if user allows" ON "public"."user_reading_stats" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (( SELECT "privacy_settings"."show_reading_activity"
   FROM "public"."privacy_settings"
  WHERE ("privacy_settings"."user_id" = "user_reading_stats"."user_id")) = true)));



CREATE POLICY "Storyboard episodes are viewable by everyone" ON "public"."storyboard_episodes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "storyboard_episodes"."article_id") AND ("articles"."status" = 'published'::"text")))) OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Storyboard series are viewable by everyone" ON "public"."storyboard_series" FOR SELECT USING ((("status" = 'active'::"text") OR "public"."is_moderator_or_admin"()));



CREATE POLICY "System can insert reading stats" ON "public"."user_reading_stats" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Tags are viewable by everyone" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Users and system can update reading stats" ON "public"."user_reading_stats" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can create article votes" ON "public"."article_votes" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "article_votes"."article_id") AND (("articles"."status" = 'published'::"text") OR "public"."is_moderator_or_admin"()))))));



CREATE POLICY "Users can create comment likes" ON "public"."comment_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create comments on published articles" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own media assets" ON "public"."media_assets" FOR DELETE USING (("uploader_id" = "auth"."uid"()));



CREATE POLICY "Users can flag content" ON "public"."flagged_content" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own privacy settings" ON "public"."privacy_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own media assets" ON "public"."media_assets" FOR UPDATE USING (("uploader_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own privacy settings" ON "public"."privacy_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can upload media assets" ON "public"."media_assets" FOR INSERT WITH CHECK ((("auth"."uid"() = "uploader_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view comment likes on published comments" ON "public"."comment_likes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."comments"
  WHERE (("comments"."id" = "comment_likes"."comment_id") AND ("comments"."status" = 'published'::"text")))) OR "public"."is_moderator_or_admin"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own privacy settings" ON "public"."privacy_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Video articles are viewable by everyone" ON "public"."video_articles" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."articles"
  WHERE (("articles"."id" = "video_articles"."article_id") AND ("articles"."status" = 'published'::"text")))) OR "public"."is_moderator_or_admin"()));



ALTER TABLE "public"."achievement_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."article_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."article_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."article_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."article_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."article_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debate_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flagged_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storyboard_episodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storyboard_series" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_reading_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_articles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."create_storyboard_series"("p_user_id" "uuid", "p_series_data" "jsonb", "p_episodes_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_storyboard_series"("p_user_id" "uuid", "p_series_data" "jsonb", "p_episodes_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_storyboard_series"("p_user_id" "uuid", "p_series_data" "jsonb", "p_episodes_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_article_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_article_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_article_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_comment_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_comment_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_comment_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_author_or_above"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_author_or_above"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_author_or_above"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_moderator_or_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_moderator_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_moderator_or_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_db_performance"("p_function_name" "text", "p_duration_ms" integer, "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_db_performance"("p_function_name" "text", "p_duration_ms" integer, "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_db_performance"("p_function_name" "text", "p_duration_ms" integer, "p_context" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_article_draft"("p_article_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_article_draft"("p_article_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_article_draft"("p_article_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_draft_optimized"("p_user_id" "uuid", "p_article_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_draft_optimized"("p_user_id" "uuid", "p_article_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_draft_optimized"("p_user_id" "uuid", "p_article_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_article_for_review"("p_article_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_article_for_review"("p_article_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_article_for_review"("p_article_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_article_optimized"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_article_optimized"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_article_optimized"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_article_with_validation"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_article_with_validation"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_article_with_validation"("p_user_id" "uuid", "p_article_data" "jsonb", "p_save_draft" boolean) TO "service_role";


















GRANT ALL ON TABLE "public"."achievement_types" TO "anon";
GRANT ALL ON TABLE "public"."achievement_types" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_types" TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."article_reviews" TO "anon";
GRANT ALL ON TABLE "public"."article_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."article_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."article_revisions" TO "anon";
GRANT ALL ON TABLE "public"."article_revisions" TO "authenticated";
GRANT ALL ON TABLE "public"."article_revisions" TO "service_role";



GRANT ALL ON TABLE "public"."article_tags" TO "anon";
GRANT ALL ON TABLE "public"."article_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."article_tags" TO "service_role";



GRANT ALL ON TABLE "public"."article_views" TO "anon";
GRANT ALL ON TABLE "public"."article_views" TO "authenticated";
GRANT ALL ON TABLE "public"."article_views" TO "service_role";



GRANT ALL ON TABLE "public"."article_votes" TO "anon";
GRANT ALL ON TABLE "public"."article_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."article_votes" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."debate_articles" TO "anon";
GRANT ALL ON TABLE "public"."debate_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."debate_articles" TO "service_role";



GRANT ALL ON TABLE "public"."flagged_content" TO "anon";
GRANT ALL ON TABLE "public"."flagged_content" TO "authenticated";
GRANT ALL ON TABLE "public"."flagged_content" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_requests" TO "anon";
GRANT ALL ON TABLE "public"."invitation_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_requests" TO "service_role";



GRANT ALL ON TABLE "public"."media_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."performance_logs" TO "anon";
GRANT ALL ON TABLE "public"."performance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_settings" TO "anon";
GRANT ALL ON TABLE "public"."privacy_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_settings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."storyboard_episodes" TO "anon";
GRANT ALL ON TABLE "public"."storyboard_episodes" TO "authenticated";
GRANT ALL ON TABLE "public"."storyboard_episodes" TO "service_role";



GRANT ALL ON TABLE "public"."storyboard_series" TO "anon";
GRANT ALL ON TABLE "public"."storyboard_series" TO "authenticated";
GRANT ALL ON TABLE "public"."storyboard_series" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_reading_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_reading_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reading_stats" TO "service_role";



GRANT ALL ON TABLE "public"."video_articles" TO "anon";
GRANT ALL ON TABLE "public"."video_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."video_articles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
