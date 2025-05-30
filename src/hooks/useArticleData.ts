
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { fetchArticleById, fetchRelatedArticles } from '@/utils/articles/fetchArticle';
import { isDebateArticle, fetchDebateSettings } from '@/utils/articles';
import { trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
import { checkArticlePublished } from '@/services/articles/articleMetricsService';
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
            const debateData = await fetchDebateSettings(articleId);
            if (debateData) {
              // Map the data to the expected format for the components
              const enhancedDebateSettings = {
                question: debateData.question || articleData.title,
                yes_position: debateData.yes_position,
                no_position: debateData.no_position,
                voting_enabled: debateData.voting_enabled,
                voting_ends_at: debateData.voting_ends_at,
                initialVotes: debateData.initialVotes || { yes: 0, no: 0 }
              };
              
              logger.info(LogSource.ARTICLE, 'Debate settings loaded successfully', {
                articleId,
                hasQuestion: !!enhancedDebateSettings.question,
                hasYesPosition: !!enhancedDebateSettings.yes_position,
                hasNoPosition: !!enhancedDebateSettings.no_position
              });
              
              setDebateSettings(enhancedDebateSettings);
            } else {
              logger.warn(LogSource.ARTICLE, 'No debate settings found for debate article', { articleId });
              // Set default debate settings for debate articles without saved settings
              setDebateSettings({
                question: articleData.title,
                yes_position: '',
                no_position: '',
                voting_enabled: true,
                voting_ends_at: null,
                initialVotes: { yes: 0, no: 0 }
              });
            }
          } catch (debateError) {
            logger.error(LogSource.ARTICLE, 'Error loading debate settings', debateError);
            // Set minimal debate settings as fallback
            setDebateSettings({
              question: articleData.title,
              yes_position: '',
              no_position: '',
              voting_enabled: true,
              voting_ends_at: null,
              initialVotes: { yes: 0, no: 0 }
            });
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
