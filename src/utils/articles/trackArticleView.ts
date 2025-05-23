
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Validates if an article ID is valid for tracking
 */
const validateArticleId = (articleId: string | undefined): articleId is string => {
  return Boolean(articleId && articleId.length > 0);
};

/**
 * Track a view for an article
 * @param articleId Article ID to track the view for
 * @param userId Optional user ID of the viewer
 * @returns Promise resolving to success status
 */
export const trackArticleView = async (
  articleId: string | undefined, 
  userId?: string
): Promise<boolean> => {
  try {
    if (!validateArticleId(articleId)) {
      logger.warn(LogSource.DATABASE, 'Invalid article ID for view tracking');
      return false;
    }

    // Check if the article exists and is published before tracking the view
    const { data: articleExists, error: checkError } = await supabase
      .from('articles')
      .select('id, status')
      .eq('id', articleId)
      .single();
    
    if (checkError) {
      logger.warn(LogSource.DATABASE, 'Error checking article status for view tracking', { 
        error: checkError, 
        articleId 
      });
      return false;
    }
    
    // Critical check: Only track views for published articles
    if (!articleExists || articleExists.status !== 'published') {
      logger.info(LogSource.DATABASE, 'Skipping view tracking - article not published', { 
        articleId,
        status: articleExists?.status || 'not found'
      });
      return false;
    }

    const { error } = await supabase
      .from('article_views')
      .insert({
        article_id: articleId,
        user_id: userId || null
      });

    if (error) {
      logger.error(LogSource.DATABASE, 'Error tracking article view', error);
      return false;
    }

    logger.debug(LogSource.DATABASE, 'Article view tracked successfully', { articleId });
    return true;
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception tracking article view', error);
    return false;
  }
};

/**
 * Enhanced version with retry logic
 * @param articleId Article ID to track the view for
 * @param userId Optional user ID of the viewer
 * @param maxRetries Maximum number of retries
 * @returns Promise resolving to success status
 */
export const trackArticleViewWithRetry = async (
  articleId: string | undefined, 
  userId?: string, 
  maxRetries = 3
): Promise<boolean> => {
  if (!validateArticleId(articleId)) {
    logger.warn(LogSource.DATABASE, 'Invalid article ID for view tracking');
    return false;
  }

  let retries = 0;
  
  while (retries < maxRetries) {
    const success = await trackArticleView(articleId, userId);
    
    if (success) {
      return true;
    }
    
    retries++;
    
    if (retries < maxRetries) {
      // Wait with exponential backoff before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
  
  return false;
};
