
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const validateArticleId = (articleId: string | undefined): articleId is string => {
  return Boolean(articleId && articleId.length > 0);
};

export const trackArticleView = async (
  articleId: string | undefined, 
  userId?: string
): Promise<boolean> => {
  try {
    if (!validateArticleId(articleId)) {
      logger.warn(LogSource.DATABASE, 'Invalid article ID for view tracking');
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

    return true;
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception tracking article view', error);
    return false;
  }
};

// Enhanced version with retry logic
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
