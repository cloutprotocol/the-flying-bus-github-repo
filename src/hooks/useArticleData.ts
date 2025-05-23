
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { fetchArticleById, fetchRelatedArticles } from '@/utils/articles/fetchArticle';
import { isDebateArticle, fetchDebateSettings } from '@/utils/articles';
import { trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
import { checkArticlePublished } from '@/services/articleMetricsService';
import { handleApiError } from '@/utils/apiErrorHandler';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useArticleData = (articleId: string | undefined) => {
  const [article, setArticle] = useState<ArticleProps | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleProps[]>([]);
  const [debateSettings, setDebateSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Log that we're loading an article
        logger.info(LogSource.ARTICLE, 'Loading article', { articleId });
        
        // Fetch the article with our improved fetchArticleById function
        const articleData = await fetchArticleById(articleId);
        
        if (!articleData) {
          setIsLoading(false);
          toast({
            title: "Article not found",
            description: "We couldn't find the article you're looking for.",
            variant: "destructive"
          });
          return;
        }
        
        setArticle(articleData);
        
        // Check if article is published before tracking the view
        const isPublished = await checkArticlePublished(articleId);
        
        if (isPublished) {
          trackArticleViewWithRetry(articleId, user?.id)
            .catch(error => {
              logger.error(LogSource.DATABASE, 'Failed to track article view', error);
            });
        } else {
          logger.info(LogSource.ARTICLE, 'Skipping view tracking for unpublished article', {
            articleId
          });
        }
        
        // Load debate settings if it's a debate article
        if (isDebateArticle(articleData.articleType)) {
          try {
            const debate = await fetchDebateSettings(articleId);
            setDebateSettings(debate);
          } catch (debateError) {
            logger.error(LogSource.ARTICLE, 'Error loading debate settings', debateError);
          }
        }
        
        // Load related articles
        if (articleData.categoryId) {
          try {
            const related = await fetchRelatedArticles(articleId, articleData.categoryId);
            setRelatedArticles(related);
          } catch (relatedError) {
            logger.error(LogSource.ARTICLE, 'Error loading related articles', relatedError);
            setRelatedArticles([]);
          }
        }
      } catch (error) {
        logger.error(LogSource.ARTICLE, 'Error loading article', error);
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadArticle();
  }, [articleId, user?.id, toast]);

  return { article, relatedArticles, debateSettings, isLoading };
};
