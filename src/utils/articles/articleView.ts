
import { supabase } from '@/integrations/supabase/client';

export const trackArticleView = async (articleId: string, userId?: string) => {
  try {
    const { error } = await supabase
      .from('article_views')
      .insert({
        article_id: articleId,
        user_id: userId || null
      });

    if (error) {
      console.error('Error tracking article view:', error);
    }
  } catch (error) {
    console.error('Failed to track article view:', error);
  }
};

export const trackArticleViewWithRetry = async (articleId: string, userId?: string, maxRetries = 2) => {
  let retries = 0;
  
  const attemptTracking = async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('article_views')
        .insert({
          article_id: articleId,
          user_id: userId || null
        });

      if (error) {
        console.error('Error tracking article view:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to track article view:', error);
      return false;
    }
  };
  
  let success = await attemptTracking();
  
  while (!success && retries < maxRetries) {
    console.log(`Retrying article view tracking (${retries + 1}/${maxRetries})...`);
    retries++;
    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    success = await attemptTracking();
  }
  
  return success;
};

