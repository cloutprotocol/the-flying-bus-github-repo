
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import CategoryPageSkeleton from '@/components/Category/CategoryPageSkeleton';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { useArticlePagination } from '@/hooks/useArticlePagination';
import { useCategoryData } from '@/hooks/category/useCategoryData';
import { useCategoryFilters } from '@/hooks/category/useCategoryFilters';
import { getCategoryColorClass } from '@/utils/category/categoryHelpers';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface CategoryPageContainerProps {
  category?: string;
}

const CategoryPageContainer: React.FC<CategoryPageContainerProps> = ({ category: propCategory }) => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  const pathCategory = location.pathname.split('/')[1];
  const categorySlug = propCategory || categoryId || pathCategory;

  const {
    categoryData,
    displayCategory,
    availableReadingLevels,
    isLoadingCategory,
    error
  } = useCategoryData(categorySlug);

  const {
    articles: paginatedArticles,
    isLoading,
    error: articlesError,
    totalPages,
    currentPage,
    setPage,
    setSortBy,
    setCategory,
    clearFilters
  } = useArticlePagination({
    sortBy: 'newest',
    pageSize: 6
  });

  const {
    selectedReadingLevel,
    handleReadingLevelChange,
    handleSortChange,
    handleClearFilters
  } = useCategoryFilters(clearFilters);

  React.useEffect(() => {
    if (categoryData?.id) {
      setCategory(categoryData.id);
    }
  }, [categoryData?.id, setCategory]);

  if (!isLoadingCategory && !categoryData) {
    logger.warn(LogSource.CLIENT, `Displaying not found message for category: ${categorySlug}`);
    return (
      <NotFoundMessage 
        title="Category Not Found"
        message="Sorry, we couldn't find the category you're looking for."
      />
    );
  }

  if (error || articlesError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          {error || "We couldn't load the articles for this category. Please try again later."}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-flyingbus-blue text-white rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  if ((isLoadingCategory || isLoading) && !paginatedArticles.length) {
    logger.info(LogSource.CLIENT, 'Displaying category page skeleton loader');
    return <CategoryPageSkeleton />;
  }

  logger.info(LogSource.CLIENT, `Rendering category page: ${displayCategory}, articles: ${paginatedArticles.length}`);
  
  const colorClass = getCategoryColorClass(displayCategory, categoryData?.color);
  const hasActiveFilters = selectedReadingLevel !== null || currentPage > 1;

  return (
    <div className="max-w-6xl mx-auto">
      <CategoryPageContent 
        displayCategory={displayCategory} 
        colorClass={colorClass}
        breadcrumbItems={[
          { label: 'Home', href: '/' },
          { label: displayCategory || '', active: true }
        ]}
        sortBy={isLoading ? 'newest' : 'newest'}
        onSortChange={handleSortChange}
        availableReadingLevels={availableReadingLevels}
        selectedReadingLevel={selectedReadingLevel}
        onReadingLevelChange={handleReadingLevelChange}
        hasActiveFilters={hasActiveFilters}
        clearFilters={handleClearFilters}
        paginatedArticles={paginatedArticles}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

export default CategoryPageContainer;
