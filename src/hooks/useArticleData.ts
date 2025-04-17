
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { getArticleById } from '@/services/articleService';
import { 
  isDebateArticle, 
  fetchDebateSettings, 
  fetchRelatedArticles,
  trackArticleViewWithRetry 
} from '@/utils/articles';
import { handleApiError } from '@/utils/apiErrorHandler';

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
        
        if (articleId) {
          trackArticleViewWithRetry(articleId, user?.id);
        }
        
        if (articleData && isDebateArticle(articleData.articleType)) {
          try {
            const debate = await fetchDebateSettings(articleId);
            setDebateSettings(debate);
          } catch (debateError) {
            console.error('Error loading debate settings:', debateError);
          }
        }
        
        if (articleData && articleData.categoryId) {
          try {
            const related = await fetchRelatedArticles(articleId, articleData.categoryId);
            setRelatedArticles(related);
          } catch (relatedError) {
            console.error('Error loading related articles:', relatedError);
          }
        }
      } catch (error) {
        console.error('Error loading article:', error);
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadArticle();
  }, [articleId, user?.id, toast]);

  return { article, relatedArticles, debateSettings, isLoading };
};
