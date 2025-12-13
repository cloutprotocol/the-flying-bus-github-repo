
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

/**
 * Update an article's status (draft, pending, published, etc.)
 * 
 * @param articleId The article ID to update
 * @param status The new status of the article
 * @returns Success status and any error
 */
export const updateArticleStatus = async (
  articleId: string,
  status: 'draft' | 'pending' | 'pending_review' | 'published' | 'rejected' | 'archived'
): Promise<{ success: boolean; error?: any }> => {
  try {
    const convexUrl = import.meta.env.VITE_CONVEX_URL!;
    const convexClient = new ConvexHttpClient(convexUrl);
    const normalized = status === 'pending' ? 'pending_review' : status;

    logger.info(LogSource.ARTICLE, `Updating article ${articleId} status to '${normalized}'`);

    await convexClient.mutation(api.articles.updateStatus, {
      id: articleId as Id<'articles'>,
      status: normalized,
    });

    logger.info(LogSource.ARTICLE, `Successfully updated article ${articleId} status to '${normalized}'`);
    return { success: true };
  } catch (e) {
    logger.error(LogSource.ARTICLE, `Exception updating article ${articleId} status`, { error: e });
    return { success: false, error: e };
  }
};
