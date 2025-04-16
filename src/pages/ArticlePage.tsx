
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
  fetchArticleById, 
  trackArticleView, 
  isDebateArticle,
  isStoryboardArticle,
  fetchDebateSettings,
  fetchRelatedArticles 
} from '@/utils/articleUtils';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [article, setArticle] = useState<ArticleProps | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleProps[]>([]);
  const [debateSettings, setDebateSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) return;
      
      setIsLoading(true);
      
      try {
        // Fetch the article
        const articleData = await fetchArticleById(articleId);
        
        if (!articleData) {
          setIsLoading(false);
          return;
        }
        
        setArticle(articleData);
        
        // Track the article view
        trackArticleView(articleId, user?.id);
        
        // If it's a debate article, fetch the debate settings
        if (isDebateArticle(articleData.articleType)) {
          const debate = await fetchDebateSettings(articleId);
          setDebateSettings(debate);
        }
        
        // Fetch related articles
        if (articleData.categoryId) {
          const related = await fetchRelatedArticles(articleId, articleData.categoryId);
          setRelatedArticles(related);
        }
      } catch (error) {
        console.error('Error loading article:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadArticle();
  }, [articleId, user?.id]);

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
  if (isStoryboardArticle(article.articleType)) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p>Loading storyboard series...</p>
        </div>
      </MainLayout>
    );
  }

  // Check if this is a debate article
  const isDebate = isDebateArticle(article.articleType);

  return (
    <MainLayout fullWidth>
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
    </MainLayout>
  );
};

export default ArticlePage;
