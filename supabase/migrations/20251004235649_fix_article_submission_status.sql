-- Fix Article Submission Status Issue
-- This migration ensures that articles submitted for review properly get 'pending_review' status
-- and stay in that status until manually approved by admins

-- First, drop existing functions to avoid conflicts (all overloads)
DROP FUNCTION IF EXISTS submit_article_with_validation CASCADE;
DROP FUNCTION IF EXISTS submit_article_optimized CASCADE;
DROP FUNCTION IF EXISTS submit_article_for_review CASCADE;

-- Now recreate them with the correct status handling

CREATE OR REPLACE FUNCTION submit_article_with_validation(
  p_user_id UUID,
  p_article_data JSONB,
  p_save_draft BOOLEAN DEFAULT false
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, article_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  v_article_type := COALESCE(p_article_data->>'articleType', p_article_data->>'article_type', 'standard');
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
      
      -- Skip if already pending review
      IF v_article_status IN ('pending', 'pending_review') THEN
        RETURN QUERY SELECT true, NULL::TEXT, v_article_id;
        RETURN;
      END IF;
    END IF;
    
    -- If no existing article ID, we need to create the article first
    IF v_article_id IS NULL THEN
      -- Create new article directly with pending_review status
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
        submitted_for_review_at
      ) VALUES (
        COALESCE(v_article_title, 'Untitled Article'),
        COALESCE(p_article_data->>'content', ''),
        p_article_data->>'excerpt',
        COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl'),
        COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID),
        p_user_id,
        'pending_review',
        v_article_type,
        COALESCE(v_slug, 'article-' || floor(extract(epoch from now()))::text),
        now()
      )
      RETURNING id INTO v_article_id;
      
    ELSE
      -- If saving as draft first for existing article
      IF p_save_draft THEN
        -- Save article draft
        v_article_id := save_article_draft(p_article_data);
        
        -- Check if draft was saved successfully
        IF v_article_id IS NULL THEN
          RETURN QUERY SELECT false, 'Failed to save article draft', NULL::UUID;
          RETURN;
        END IF;
      END IF;
      
      -- Update existing article status to pending_review and set submission timestamp
      UPDATE articles
      SET 
        status = 'pending_review',
        submitted_for_review_at = now(),
        updated_at = now()
      WHERE id = v_article_id;
      
      -- Verify the update worked
      IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Failed to update article status', NULL::UUID;
        RETURN;
      END IF;
    END IF;
    
    -- Success
    RETURN QUERY SELECT true, NULL::TEXT, v_article_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Handle errors
    RETURN QUERY SELECT false, SQLERRM, NULL::UUID;
  END;
END;
$$;

-- Also update the submit_article_optimized function to use pending_review
CREATE OR REPLACE FUNCTION submit_article_optimized(
  p_user_id UUID,
  p_article_data JSONB
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, article_id UUID, execution_time_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
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
      
      -- Skip processing if already pending review
      IF v_article_status IN ('pending', 'pending_review') THEN
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
        status = 'pending_review',
        article_type = COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', article_type),
        submitted_for_review_at = now(),
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
        slug,
        submitted_for_review_at
      ) VALUES (
        COALESCE(v_article_title, 'Untitled Article'),
        COALESCE(p_article_data->>'content', ''),
        p_article_data->>'excerpt',
        COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl'),
        COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID),
        v_author_id,
        'pending_review',
        v_article_type,
        COALESCE(v_slug, 'article-' || floor(extract(epoch from now()))::text),
        now()
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

-- Also update the submit_article_for_review function to use pending_review
CREATE OR REPLACE FUNCTION submit_article_for_review(
  p_article_id UUID,
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, article_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Skip if already pending review
  IF v_article_status IN ('pending', 'pending_review') THEN
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
      status = 'pending_review',
      author_id = COALESCE(author_id, p_user_id),
      submitted_for_review_at = now(),
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

-- Add a comment to track this fix
COMMENT ON FUNCTION submit_article_with_validation IS 'Updated to use pending_review status instead of pending for article submissions';
COMMENT ON FUNCTION submit_article_optimized IS 'Updated to use pending_review status instead of pending for article submissions';
COMMENT ON FUNCTION submit_article_for_review IS 'Updated to use pending_review status instead of pending for article submissions';