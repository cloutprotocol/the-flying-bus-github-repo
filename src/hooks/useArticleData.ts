
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { getArticleById } from '@/services/articleService';
import { 
  isDebateArticle, 
  fetchDebateSettings, 
  fetchRelatedArticles
} from '@/utils/articles';
import { trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
import { handleApiError } from '@/utils/apiErrorHandler';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { withErrorHandling } from '@/utils/errorHandling';

export const useArticleData = (articleId: string | undefined) => {
  const [article, setArticle] = useState<ArticleProps | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleProps[]>([]);
  const [debateSettings, setDebateSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) return;
      
      setIsLoading(true);
      
      try {
        // Log that we're loading an article
        logger.info(LogSource.ARTICLE, 'Loading article', { articleId });
        
        const { article: articleData, error } = await getArticleById(articleId);
        
        if (error) {
          throw error;
        }
        
        if (!articleData) {
          setIsLoading(false);
          toast({
            title: "Article not found",
            description: "We couldn't find the article you're looking for.",
            variant: "destructive"
          });
          return;
        }
        
        const processedArticle = {
          ...articleData,
          category: articleData.category || 'Uncategorized'
        };
        
        setArticle(processedArticle);
        
        // Only track views for published articles and when we have a valid article ID
        if (articleData.status === 'published') {
          // Use .catch to handle errors without disrupting the main flow
          trackArticleViewWithRetry(articleId, user?.id)
            .catch(error => {
              logger.error(LogSource.DATABASE, 'Failed to track article view', error);
            });
        }
        
        if (articleData && isDebateArticle(articleData.articleType)) {
          try {
            const debate = await fetchDebateSettings(articleId);
            setDebateSettings(debate);
          } catch (debateError) {
            logger.error(LogSource.ARTICLE, 'Error loading debate settings', debateError);
          }
        }
        
        if (articleData && articleData.categoryId) {
          try {
            const related = await fetchRelatedArticles(articleId, articleData.categoryId);
            setRelatedArticles(related);
          } catch (relatedError) {
            logger.error(LogSource.ARTICLE, 'Error loading related articles', relatedError);
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
