
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { fetchArticleById, fetchRelatedArticles } from '@/utils/articles';
import { isDebateArticle, fetchDebateSettings } from '@/utils/articles';
import { trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useArticleData = (articleId: string | undefined) => {
  const [article, setArticle] = useState<ArticleProps | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleProps[]>([]);
  const [debateSettings, setDebateSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        setIsLoading(false);
        setError('No article ID provided');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        logger.info(LogSource.ARTICLE, 'Loading article', { articleId });
        
        const articleData = await fetchArticleById(articleId);
        
        if (!articleData) {
          setIsLoading(false);
          setError('Article not found');
          toast({
            title: "Article not found",
            description: "The article you're looking for could not be found.",
            variant: "destructive"
          });
          return;
        }
        
        logger.info(LogSource.ARTICLE, 'Article loaded successfully', { 
          id: articleData.id, 
          title: articleData.title
        });
        
        setArticle(articleData);
        
        // Track article view
        if (articleData.id) {
          trackArticleViewWithRetry(articleData.id, user?.id)
            .catch(error => {
              logger.error(LogSource.DATABASE, 'Failed to track article view', error);
            });
        }
        
        // Load debate settings if it's a debate article
        if (articleData && isDebateArticle(articleData.articleType)) {
          try {
            const debate = await fetchDebateSettings(articleId);
            setDebateSettings(debate);
          } catch (debateError) {
            logger.error(LogSource.ARTICLE, 'Error loading debate settings', debateError);
          }
        }
        
        // Load related articles if we have a category ID
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
        setError('Failed to load article');
        toast({
          title: "Error",
          description: "Failed to load the article. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadArticle();
  }, [articleId, user?.id, toast]);

  return { article, relatedArticles, debateSettings, isLoading, error };
};
