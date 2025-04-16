
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import FeatureArticle from '@/components/Articles/FeatureArticle';
import CategorySection from '@/components/Articles/CategorySection';
import { getHeadlineArticle, getCategoryArticles } from '@/data/articles';
import { ArticleProps } from '@/components/Articles/ArticleCard';

const Index = () => {
  const [headlineArticle, setHeadlineArticle] = useState<ArticleProps | null>(null);
  const [categoryArticles, setCategoryArticles] = useState<Record<string, ArticleProps[]>>({});
  const [isLoading, setIsLoading] = useState(true);

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
      const headline = await getHeadlineArticle();
      setHeadlineArticle(headline);

      const articlePromises = categoryMapping.map(async (category) => {
        const articles = await getCategoryArticles(category.title);
        return { [category.title]: articles };
      });

      const articleResults = await Promise.all(articlePromises);
      const articlesMap = articleResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setCategoryArticles(articlesMap);
      setIsLoading(false);
    };

    fetchArticles();

    const headerHeight = document.querySelector('header')?.offsetHeight || 80;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  }, []);

  if (isLoading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex justify-center items-center h-screen">
          Loading articles...
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
          {categoryMapping.slice(0, 2).map((category) => (
            <CategorySection
              key={category.slug}
              title={category.title}
              slug={category.slug}
              articles={categoryArticles[category.title] || []}
              color={category.color}
            />
          ))}
        </div>
        
        <div className="space-y-12">
          {categoryMapping.slice(2).map((category) => (
            <CategorySection
              key={category.slug}
              title={category.title}
              slug={category.slug}
              articles={categoryArticles[category.title] || []}
              color={category.color}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
