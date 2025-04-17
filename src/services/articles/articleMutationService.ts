
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const createArticle = async (articleData: any) => {
  try {
    logger.info(LogSource.ARTICLE, 'Creating new article');
    
    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error creating article', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception creating article', e);
    return { data: null, error: e };
  }
};

export const updateArticle = async (articleId: string, updates: any) => {
  try {
    logger.info(LogSource.ARTICLE, `Updating article ${articleId}`);
    
    const { data, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', articleId)
      .select()
      .single();
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error updating article', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception updating article', e);
    return { data: null, error: e };
  }
};

export const deleteArticle = async (articleId: string): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.ARTICLE, `Deleting article ${articleId}`);
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);
    
    if (error) {
      logger.error(LogSource.ARTICLE, `Error deleting article: ${error.message}`, error);
      return { success: false, error };
    }
    
    logger.info(LogSource.ARTICLE, `Article deleted successfully: ${articleId}`);
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception deleting article', e);
    return { success: false, error: e };
  }
};
