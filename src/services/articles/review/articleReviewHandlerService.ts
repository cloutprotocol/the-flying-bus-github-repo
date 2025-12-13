
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

export const reviewArticle = async (
  articleId: string,
  review: { status: StatusType; feedback?: string }
) => {
  try {
    logger.info(LogSource.ARTICLE, `Reviewing article ${articleId}`);
    const convexUrl = import.meta.env.VITE_CONVEX_URL!;
    const convex = new ConvexHttpClient(convexUrl);

    // Normalize pending to pending_review for Convex
    const normalized = review.status === 'pending' ? 'pending_review' : review.status;
    await convex.mutation(api.articles.updateStatus, {
      id: articleId as Id<'articles'>,
      status: normalized,
    });

    // Note: Review audit trail can be added via api.articles.* mutations later.
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception reviewing article', e);
    return { success: false, error: e };
  }
};
