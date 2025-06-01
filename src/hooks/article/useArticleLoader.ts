
import { useState, useEffect } from 'react';
import { getArticleById } from '@/services/articles/articleQueryService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface ArticleData {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  categoryId: string;
  categoryName: string;
  slug: string;
  articleType: string;
  status: string;
}

interface UseArticleLoaderResult {
  articleData: ArticleData | null;
  isLoading: boolean;
  error: string | null;
}

export const useArticleLoader = (articleId?: string): UseArticleLoaderResult => {
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState(!!articleId);
  const [error, setError] = useState<string | null>(null);

  logger.debug(LogSource.EDITOR, 'Article loader hook initialized', { 
    articleId,
    hasArticleId: !!articleId 
  });

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        logger.debug(LogSource.EDITOR, 'No articleId provided, skipping article load');
        setIsLoading(false);
        return;
      }

      try {
        logger.info(LogSource.EDITOR, 'Loading article for editing', { articleId });
        setIsLoading(true);
        setError(null);

        const { article, error: fetchError } = await getArticleById(articleId);
        
        if (fetchError) {
          logger.error(LogSource.EDITOR, 'Error loading article from service', { 
            articleId, 
            error: fetchError,
            errorMessage: fetchError.message 
          });
          setError(fetchError.message || 'Failed to load article');
          return;
        }

        if (!article) {
          const errorMsg = 'Article not found';
          logger.error(LogSource.EDITOR, errorMsg, { articleId });
          setError(errorMsg);
          return;
        }

        const transformedData: ArticleData = {
          id: article.id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          imageUrl: article.imageUrl || '',
          categoryId: article.categoryId || '',
          categoryName: article.category,
          slug: article.id, // Using ID as fallback for slug
          articleType: article.articleType || 'standard',
          status: 'draft' // Default status for editing
        };

        logger.info(LogSource.EDITOR, 'Article loaded and transformed successfully', {
          articleId: transformedData.id,
          title: transformedData.title,
          categoryName: transformedData.categoryName,
          articleType: transformedData.articleType
        });

        setArticleData(transformedData);
      } catch (err) {
        const errorMsg = `Failed to load article: ${err instanceof Error ? err.message : 'Unknown error'}`;
        logger.error(LogSource.EDITOR, 'Exception during article loading', { 
          articleId, 
          error: err,
          errorMessage: err instanceof Error ? err.message : 'Unknown error'
        });
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId]);

  const result = { articleData, isLoading, error };
  logger.debug(LogSource.EDITOR, 'Article loader returning result', { 
    hasData: !!result.articleData,
    isLoading: result.isLoading,
    hasError: !!result.error,
    articleId
  });

  return result;
};
