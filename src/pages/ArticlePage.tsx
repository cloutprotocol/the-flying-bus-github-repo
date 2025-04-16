import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import ArticleHeader from '@/components/Articles/ArticleHeader';
import ArticleContent from '@/components/Articles/ArticleContent';
import ArticleSidebar from '@/components/Articles/ArticleSidebar';
import ArticleFooter from '@/components/Articles/ArticleFooter';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { 
  isDebateArticle,
  isStoryboardArticle,
  fetchDebateSettings,
  fetchRelatedArticles 
} from '@/utils/articleUtils';
import { 
  trackArticleViewWithRetry
} from '@/utils/articleSync';
import { getArticleById } from '@/services/articleService';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { handleApiError, ApiErrorType } from '@/utils/apiErrorHandler';

const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [article, setArticle] = useState<ArticleProps | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleProps[]>([]);
  const [debateSettings, setDebateSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) return;
      
      setIsLoading(true);
      
      try {
        // Fetch the article using our service
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
        
        setArticle(articleData);
        
        // Track the article view with retry
        trackArticleViewWithRetry(articleId, user?.id);
        
        // If it's a debate article, fetch the debate settings
        if (isDebateArticle(articleData.articleType)) {
          try {
            const debate = await fetchDebateSettings(articleId);
            setDebateSettings(debate);
          } catch (debateError) {
            console.error('Error loading debate settings:', debateError);
            // Don't block article display for debate settings error
          }
        }
        
        // Fetch related articles
        if (articleData.categoryId) {
          try {
            const related = await fetchRelatedArticles(articleId, articleData.categoryId);
            setRelatedArticles(related);
          } catch (relatedError) {
            console.error('Error loading related articles:', relatedError);
            // Don't block article display for related articles error
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

  // Redirect to Storyboard page if it's a storyboard article
  useEffect(() => {
    if (article && isStoryboardArticle(article.articleType)) {
      navigate(`/storyboard/${article.id}`);
    }
  }, [article, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-8" />
            </div>
            <div className="lg:col-span-4">
              <Skeleton className="h-48 w-full mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!article) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Article Not Found</h1>
          <p className="mb-8">Sorry, we couldn't find the article you're looking for.</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // If this is a storyboard article, we'll show a loading state briefly before redirect
  if (article && isStoryboardArticle(article.articleType)) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p>Loading storyboard series...</p>
        </div>
      </MainLayout>
    );
  }

  // Check if this is a debate article
  const isDebate = article ? isDebateArticle(article.articleType) : false;

  return (
    <MainLayout fullWidth>
      {article && (
        <div className="w-full bg-white">
          <ArticleHeader article={article} />
          
          <div className="w-full px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
              <ArticleContent 
                article={article} 
                articleContent={article.content || ''} 
                debateSettings={isDebate ? debateSettings : undefined}
              />
              
              <ArticleSidebar 
                article={article} 
                relatedArticles={relatedArticles}
              />
              
              <div className="lg:col-span-8">
                <ArticleFooter article={article} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-8" />
            </div>
            <div className="lg:col-span-4">
              <Skeleton className="h-48 w-full mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      )}
      
      {!isLoading && !article && (
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Article Not Found</h1>
          <p className="mb-8">Sorry, we couldn't find the article you're looking for.</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      )}
    </MainLayout>
  );
};

export default ArticlePage;
