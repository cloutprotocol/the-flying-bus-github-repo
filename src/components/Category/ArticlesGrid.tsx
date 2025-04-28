
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { InboxIcon } from 'lucide-react';

interface ArticlesGridProps {
  articles: ArticleProps[];
  hasActiveFilters: boolean;
  isLoading?: boolean;
}

const ArticleCard = lazy(() => import('@/components/Articles/ArticleCard'));

const EmptyState = ({ hasActiveFilters }: { hasActiveFilters: boolean }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <InboxIcon className="w-12 h-12 text-gray-400 mb-4" />
    <h2 className="text-xl text-gray-600 mb-2">
      {hasActiveFilters 
        ? "No articles match your current filters"
        : "No articles available in this category yet"}
    </h2>
    {hasActiveFilters && (
      <p className="text-gray-500">Try adjusting your filters to see more results</p>
    )}
  </div>
);

const LoadingGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array(6).fill(0).map((_, i) => (
      <Skeleton key={i} className="h-[300px] w-full rounded-lg" />
    ))}
  </div>
);

const ArticlesGrid: React.FC<ArticlesGridProps> = ({
  articles,
  hasActiveFilters,
  isLoading = false
}) => {
  // Add state to manage visibility transitions
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [showContent, setShowContent] = useState(!isLoading);
  
  // Handle loading state changes with a slight delay to prevent flickering
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (isLoading) {
      // Immediately show skeleton when loading starts
      setShowSkeleton(true);
      // Delay hiding content to prevent flashing
      setShowContent(false);
    } else {
      // When loading completes, delay hiding the skeleton
      timeout = setTimeout(() => {
        setShowSkeleton(false);
        // Show content after skeleton starts fading
        setTimeout(() => setShowContent(true), 50);
      }, 300); // Short delay to ensure we have content ready
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);
  
  // Handle empty state
  if (!isLoading && articles.length === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} />;
  }

  return (
    <div className="relative min-h-[300px]">
      {/* Loading skeleton with fade-out transition */}
      <div 
        className={`absolute w-full transition-opacity duration-300 ${
          showSkeleton ? 'opacity-100 z-10' : 'opacity-0 z-0'
        }`}
      >
        <LoadingGrid />
      </div>
      
      {/* Content with fade-in transition */}
      <div 
        className={`transition-opacity duration-300 ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Suspense 
              key={article.id} 
              fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}
            >
              <ArticleCard {...article} />
            </Suspense>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticlesGrid;
