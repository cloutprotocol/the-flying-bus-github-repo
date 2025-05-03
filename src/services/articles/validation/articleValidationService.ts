
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Validate required fields for an article
 */
export const validateArticleFields = (article: any): void => {
  console.log("Validating article fields:", { 
    hasTitle: !!article.title,
    hasContent: !!article.content,
    hasCategoryId: !!article.category_id,
    contentLength: article.content?.length || 0
  });

  if (!article.title || article.title.trim() === '') {
    const error = new Error('Article title is required');
    logger.error(LogSource.ARTICLE, 'Article validation error: missing title', { article });
    throw error;
  }

  if (!article.content || article.content.trim() === '') {
    const error = new Error('Article content is required');
    logger.error(LogSource.ARTICLE, 'Article validation error: missing content', { article });
    throw error;
  }

  if (!article.category_id) {
    const error = new Error('Article category is required');
    logger.error(LogSource.ARTICLE, 'Article validation error: missing category', { article });
    throw error;
  }
  
  console.log("Article validation successful");
  logger.info(LogSource.ARTICLE, 'Article validation successful', { 
    title: article.title,
    contentLength: article.content?.length || 0,
    categoryId: article.category_id
  });
};
