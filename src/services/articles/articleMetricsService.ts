
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { withErrorHandling } from '@/utils/errorHandling';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';

/**
 * Get view count for an article
 */
export const getArticleViews = async (articleId: string) => {
  return await withErrorHandling(
    async () => {
      if (!articleId || articleId.trim() === '') {
        throw new Error('Invalid article ID');
      }
      
      // View counts are not yet migrated to Convex; return 0 as a safe default
      return { count: 0 };
    },
    {
      errorMessage: 'Failed to fetch article view count',
      logSource: LogSource.ARTICLE,
      showToast: false
    }
  );
};

/**
 * Check if article exists and is published
 */
export const checkArticlePublished = async (articleId: string): Promise<boolean> => {
  try {
    if (!articleId || articleId.trim() === '') {
      logger.warn(LogSource.ARTICLE, 'Invalid article ID when checking publication status');
      return false;
    }
    const convexUrl = import.meta.env.VITE_CONVEX_URL!;
    const convexClient = new ConvexHttpClient(convexUrl);
    const data = await convexClient.query(api.articles.getById, {
      articleId: articleId as Id<'articles'>,
    });

    const isPublished = data?.status === 'published';
    logger.debug(LogSource.ARTICLE, `Article publication check: ${isPublished ? 'published' : 'not published'}`, { 
      articleId, 
      status: data?.status 
    });
    
    return isPublished;
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Error checking article status', e);
    return false;
  }
};

// Export trackArticleView from the utils file to maintain backward compatibility
export { trackArticleView, trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
