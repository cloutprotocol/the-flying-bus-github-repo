
import React, { lazy, Suspense, useEffect } from 'react';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface ArticlesGridProps {
  articles: ArticleProps[];
  hasActiveFilters: boolean;
  isLoading?: boolean;
  stableLoading?: boolean;
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
  isLoading = false,
  stableLoading = false
}) => {
  useEffect(() => {
    logger.info(LogSource.APP, 'ArticlesGrid rendering', {
      articlesCount: articles?.length || 0,
      hasArticles: articles && articles.length > 0,
      isLoading,
      stableLoading,
      hasActiveFilters
    });
    
    if (articles && articles.length > 0) {
      logger.info(LogSource.APP, 'First article details', {
        id: articles[0]?.id,
        title: articles[0]?.title,
        category: articles[0]?.category
      });
    }
  }, [articles, isLoading, stableLoading, hasActiveFilters]);

  if (stableLoading) {
    return <LoadingGrid />;
  }

  if (!stableLoading && (!articles || articles.length === 0)) {
    logger.warn(LogSource.APP, 'No articles to display', {
      hasActiveFilters,
      isLoading
    });
    return <EmptyState hasActiveFilters={hasActiveFilters} />;
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
      "transition-opacity duration-300",
      isLoading ? "opacity-50" : "opacity-100"
    )}>
      {articles.map((article) => (
        <Suspense 
          key={article.id} 
          fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}
        >
          <ArticleCard {...article} />
        </Suspense>
      ))}
    </div>
  );
};

export default ArticlesGrid;
