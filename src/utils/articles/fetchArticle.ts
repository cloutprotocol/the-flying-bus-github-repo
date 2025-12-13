
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { calculateReadTime } from './articleRead';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { getArticleById } from '@/data/articles';

export const fetchArticleById = async (articleId: string): Promise<ArticleProps | null> => {
  if (!articleId) return null;

  try {
    logger.info(LogSource.ARTICLE, `Fetching article with ID ${articleId}`);

    // TODO: Replace with Convex query when migration is complete
    // Using mock data from getArticleById
    const article = await getArticleById(articleId);

    if (!article) {
      logger.warn(LogSource.ARTICLE, `Article not found with ID: ${articleId}`);
      return null;
    }

    logger.info(LogSource.ARTICLE, `Article fetched successfully`, {
      articleId: article.id,
      category: article.category
    });

    return article as ArticleProps;
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception in fetchArticleById:', e);
    return null;
  }
};

export const fetchRelatedArticles = async (
  articleId: string,
  categoryId: string,
  limit: number = 3
): Promise<ArticleProps[]> => {
  if (!categoryId) return [];

  try {
    // TODO: Replace with Convex query when migration is complete
    // For now, return empty array as there's no mock related articles logic
    return [];
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception in fetchRelatedArticles:', e);
    return [];
  }
};
