
import React, { lazy, Suspense } from 'react';
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
  if (isLoading) {
    return <LoadingGrid />;
  }

  if (articles.length === 0) {
    return <EmptyState hasActiveFilters={hasActiveFilters} />;
  }

  return (
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
  );
};

export default ArticlesGrid;
