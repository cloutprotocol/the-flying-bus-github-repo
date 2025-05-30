
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ArticleHeader from '@/components/Articles/ArticleHeader';
import ArticleContent from '@/components/Articles/ArticleContent';
import ArticleSidebar from '@/components/Articles/ArticleSidebar';
import ArticleFooter from '@/components/Articles/ArticleFooter';
import ArticleLoadingSkeleton from '@/components/Articles/ArticleLoadingSkeleton';
import ArticleNotFound from '@/components/Articles/ArticleNotFound';
import { useArticleData } from '@/hooks/useArticleData';
import { isStoryboardArticle, isDebateArticle } from '@/utils/articles';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  
  // Log the current URL and articleId for debugging
  React.useEffect(() => {
    logger.info(LogSource.ARTICLE, 'Article page loaded', { 
      articleId, 
      currentUrl: window.location.href,
      pathname: window.location.pathname
    });
  }, [articleId]);
  
  const { article, relatedArticles, debateSettings, isLoading } = useArticleData(articleId);

  // Enhanced logging for debate articles
  React.useEffect(() => {
    if (article) {
      const isDebate = isDebateArticle(article.articleType);
      logger.info(LogSource.ARTICLE, 'Article type analysis', {
        articleId: article.id,
        articleType: article.articleType,
        isDebate,
        hasDebateSettings: !!debateSettings,
        debateQuestion: debateSettings?.question?.substring(0, 50) || 'N/A',
        hasYesPosition: !!debateSettings?.yes_position,
        hasNoPosition: !!debateSettings?.no_position
      });
    }
  }, [article, debateSettings]);

  // Redirect to Storyboard page if it's a storyboard article
  React.useEffect(() => {
    if (article && isStoryboardArticle(article.articleType)) {
      logger.info(LogSource.ARTICLE, 'Redirecting to storyboard', { articleId: article.id });
      navigate(`/storyboard/${article.id}`, { replace: true });
    }
  }, [article, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <ArticleLoadingSkeleton />
      </MainLayout>
    );
  }

  if (!article) {
    logger.warn(LogSource.ARTICLE, 'Article not found', { articleId });
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

  // Enhanced debate settings for voting component with proper field mapping
  const enhancedDebateSettings = isDebateArticle(article.articleType) && debateSettings ? {
    initialVotes: debateSettings.initialVotes || { yes: 0, no: 0 },
    question: debateSettings.question || article.title,
    yesPosition: debateSettings.yes_position, // Map from database field
    noPosition: debateSettings.no_position   // Map from database field
  } : null;

  return (
    <MainLayout fullWidth>
      <div className="w-full bg-white">
        <ArticleHeader article={article} />
        
        <div className="w-full px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
            <ArticleContent 
              article={article} 
              articleContent={article.content || ''} 
              debateSettings={enhancedDebateSettings}
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
