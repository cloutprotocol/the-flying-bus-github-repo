
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

  console.log('useArticleLoader: Hook called with articleId:', articleId);

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        console.log('useArticleLoader: No articleId provided, skipping load');
        setIsLoading(false);
        return;
      }

      try {
        console.log('useArticleLoader: Loading article with ID:', articleId);
        setIsLoading(true);
        setError(null);
        
        logger.info(LogSource.EDITOR, 'Loading article for editing', { articleId });

        const { article, error: fetchError } = await getArticleById(articleId);
        
        if (fetchError) {
          console.error('useArticleLoader: Error loading article:', fetchError);
          setError(fetchError.message || 'Failed to load article');
          logger.error(LogSource.EDITOR, 'Error loading article for editing', fetchError);
          return;
        }

        if (!article) {
          const errorMsg = 'Article not found';
          console.error('useArticleLoader:', errorMsg);
          setError(errorMsg);
          logger.error(LogSource.EDITOR, errorMsg, { articleId });
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

        console.log('useArticleLoader: Article loaded successfully:', {
          id: transformedData.id,
          title: transformedData.title,
          categoryName: transformedData.categoryName
        });

        setArticleData(transformedData);
        logger.info(LogSource.EDITOR, 'Article loaded successfully for editing', {
          articleId: transformedData.id,
          title: transformedData.title
        });
      } catch (err) {
        const errorMsg = `Failed to load article: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('useArticleLoader:', errorMsg, err);
        setError(errorMsg);
        logger.error(LogSource.EDITOR, errorMsg, err);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId]);

  const result = { articleData, isLoading, error };
  console.log('useArticleLoader: Returning result:', result);

  return result;
};
