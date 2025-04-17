
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Track article views with retry logic
export const trackArticleViewWithRetry = async (
  articleId: string, 
  userId?: string, 
  maxRetries = 3
): Promise<boolean> => {
  let retries = 0;
  
  const trackView = async (): Promise<boolean> => {
    try {
      logger.info(LogSource.DATABASE, `Tracking view for article ${articleId}`);
      
      const { error } = await supabase
        .from('article_views')
        .insert({
          article_id: articleId,
          user_id: userId || null
        });
      
      if (error) {
        logger.error(
          LogSource.DATABASE, 
          `Error tracking article view: ${error.message}`, 
          error
        );
        return false;
      }
      
      logger.info(LogSource.DATABASE, `Successfully tracked view for article ${articleId}`);
      return true;
    } catch (e) {
      logger.error(LogSource.DATABASE, 'Exception tracking article view', e);
      return false;
    }
  };
  
  while (retries < maxRetries) {
    const success = await trackView();
    
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
