
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import FeatureArticle from '@/components/Articles/FeatureArticle';
import CategorySection from '@/components/Articles/CategorySection';
import { getHeadlineArticle, getCategoryArticles } from '@/data/articles';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const Index = () => {
  const [headlineArticle, setHeadlineArticle] = useState<ArticleProps | null>(null);
  const [categoryArticles, setCategoryArticles] = useState<Record<string, ArticleProps[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryMapping = [
    { title: 'Headliners', slug: 'headliners', color: 'red' },
    { title: 'Debates', slug: 'debates', color: 'orange' },
    { title: 'Spice It Up', slug: 'spice-it-up', color: 'yellow' },
    { title: 'Storyboard', slug: 'storyboard', color: 'blue' },
    { title: 'In the Neighborhood', slug: 'neighborhood', color: 'green' },
    { title: 'Learning', slug: 'learning', color: 'purple' },
    { title: 'School News', slug: 'school', color: 'pink' },
  ];

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        logger.info(LogSource.ARTICLE, 'Fetching articles for home page');
        setIsLoading(true);
        setError(null);

        // Fetch headline article
        const headline = await getHeadlineArticle();
        setHeadlineArticle(headline);
        
        if (!headline) {
          logger.info(LogSource.ARTICLE, 'No headline article available');
        }

        // Fetch articles for each category
        const articlePromises = categoryMapping.map(async (category) => {
          const articles = await getCategoryArticles(category.title);
          return { [category.title]: articles };
        });

        const articleResults = await Promise.all(articlePromises);
        const articlesMap = articleResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        
        setCategoryArticles(articlesMap);
        
        // Log category article counts
        Object.entries(articlesMap).forEach(([category, articles]) => {
          logger.info(LogSource.ARTICLE, `Category ${category}: ${articles.length} articles loaded`);
        });

      } catch (err) {
        logger.error(LogSource.ARTICLE, 'Error fetching articles for home page', err);
        setError('Failed to load articles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();

    const headerHeight = document.querySelector('header')?.offsetHeight || 80;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  }, []);

  if (isLoading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex flex-col items-center justify-center h-[50vh] w-full">
          <Skeleton className="w-full h-64 mb-8" />
          <div className="max-w-6xl w-full mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops!</h2>
            <p className="text-gray-600">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-flyingbus-blue text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const hasContent = headlineArticle || Object.values(categoryArticles).some(articles => articles.length > 0);

  if (!hasContent) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-center max-w-2xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Published Content Yet</h2>
            <p className="text-gray-600">
              We're working on creating amazing content for you. Check back soon to see the latest articles from our young journalists!
            </p>
            <div className="mt-8">
              <p className="text-sm text-gray-500">Are you an author? Sign in to submit articles.</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full px-0 sm:px-4 py-0 sm:py-4 mb-8">
        {headlineArticle && (
          <FeatureArticle {...headlineArticle} />
        )}
      </div>
      
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 mb-16">
          {categoryMapping.slice(0, 2).map((category) => {
            const articles = categoryArticles[category.title] || [];
            if (articles.length === 0) return null;
            
            return (
              <CategorySection
                key={category.slug}
                title={category.title}
                slug={category.slug}
                articles={articles}
                color={category.color}
              />
            );
          })}
        </div>
        
        <div className="space-y-12">
          {categoryMapping.slice(2).map((category) => {
            const articles = categoryArticles[category.title] || [];
            if (articles.length === 0) return null;
            
            return (
              <CategorySection
                key={category.slug}
                title={category.title}
                slug={category.slug}
                articles={articles}
                color={category.color}
              />
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
