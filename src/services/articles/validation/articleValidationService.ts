
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { validateArticle } from '@/utils/validation/articleValidation';

/**
 * Validate required fields for an article
 * This is a thin wrapper around the central validation utility
 * to maintain backward compatibility
 */
export const validateArticleFields = (article: any): void => {
  // Use the central validation utility
  const { isValid, errors } = validateArticle(article);
  
  // If validation fails, throw the first error
  if (!isValid && errors.length > 0) {
    const error = new Error(errors[0]);
    logger.error(LogSource.ARTICLE, `Article validation error: ${errors[0]}`, { article });
    throw error;
  }
  
  // Log success
  logger.info(LogSource.ARTICLE, 'Article validation successful', { 
    title: article.title,
    contentLength: article.content?.length || 0,
    categoryId: article.category_id || article.categoryId
  });
};
