
import React from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ArticleHeader from '@/components/Articles/ArticleHeader';
import ArticleContent from '@/components/Articles/ArticleContent';
import ArticleSidebar from '@/components/Articles/ArticleSidebar';
import ArticleFooter from '@/components/Articles/ArticleFooter';
import ArticleLoadingSkeleton from '@/components/Articles/ArticleLoadingSkeleton';
import ArticleNotFound from '@/components/Articles/ArticleNotFound';
import { useArticleData } from '@/hooks/useArticleData';
import { isStoryboardArticle } from '@/utils/articles';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { article, relatedArticles, debateSettings, isLoading, error } = useArticleData(articleId);

  React.useEffect(() => {
    if (articleId) {
      logger.info(LogSource.ARTICLE, 'ArticlePage mounted', { articleId });
    }
    
    if (article) {
      logger.info(LogSource.ARTICLE, 'Article data loaded', { 
        id: article.id, 
        title: article.title,
        imageUrl: article.imageUrl
      });
    }
  }, [articleId, article]);

  // Redirect to Storyboard page if it's a storyboard article
  React.useEffect(() => {
    if (article && isStoryboardArticle(article.articleType)) {
      navigate(`/storyboard/${article.id}`);
    }
  }, [article, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <ArticleLoadingSkeleton />
      </MainLayout>
    );
  }

  if (error || !article) {
    return (
      <MainLayout>
        <ArticleNotFound />
      </MainLayout>
    );
  }

  // If this is a storyboard article, show loading state briefly before redirect
  if (article && isStoryboardArticle(article.articleType)) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p>Loading storyboard series...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth>
      <div className="w-full bg-white">
        <ArticleHeader article={article} />
        
        <div className="w-full px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
            <ArticleContent 
              article={article} 
              articleContent={article.content || ''} 
              debateSettings={debateSettings}
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
