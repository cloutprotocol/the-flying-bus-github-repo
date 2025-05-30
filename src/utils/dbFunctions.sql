
-- This file contains SQL functions for optimized database operations
-- To use these functions, they need to be executed against the database

-- Function to save and submit an article in a single transaction
CREATE OR REPLACE FUNCTION public.submit_article_optimized(
  p_user_id UUID,
  p_article_data JSONB,
  p_save_draft BOOLEAN DEFAULT true
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, article_id UUID, duration_ms INTEGER)
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
  v_article_type := p_article_data->>'articleType';
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
      
      -- OPTIMIZATION: Update article inline instead of calling another function
      UPDATE articles
      SET
        title = COALESCE(p_article_data->>'title', title),
        content = COALESCE(p_article_data->>'content', content),
        excerpt = COALESCE(p_article_data->>'excerpt', excerpt),
        cover_image = COALESCE(p_article_data->>'imageUrl', cover_image),
        category_id = COALESCE((p_article_data->>'categoryId')::UUID, category_id),
        status = 'pending',
        updated_at = now()
      WHERE id = v_article_id
      RETURNING id INTO v_result_id;
      
    ELSE
      -- OPTIMIZATION: Direct insert for new articles instead of calling another function
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
        p_article_data->>'imageUrl',
        (p_article_data->>'categoryId')::UUID,
        v_author_id,
        'pending',
        COALESCE(v_article_type, 'standard'),
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
    
    -- Handle debate article data
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

-- Function to save an article draft efficiently with duplicate detection
CREATE OR REPLACE FUNCTION public.save_draft_optimized(
  p_user_id UUID,
  p_article_data JSONB
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, article_id UUID, duration_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_article_type := p_article_data->>'articleType';
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
      COALESCE(v_article_title, 'Untitled Draft'),
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
