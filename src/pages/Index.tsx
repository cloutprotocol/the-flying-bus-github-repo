
import React, { useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import FeatureArticle from '@/components/Articles/FeatureArticle';
import CategorySection from '@/components/Articles/CategorySection';
import { getHeadlineArticle, getCategoryArticles } from '@/data/articles';

const Index = () => {
  const headlineArticle = getHeadlineArticle();
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
    const headerHeight = document.querySelector('header')?.offsetHeight || 80;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  }, []);

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full px-0 sm:px-4 py-0 sm:py-4">
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
              articles={getCategoryArticles(category.title)}
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
              articles={getCategoryArticles(category.title)}
              color={category.color}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
