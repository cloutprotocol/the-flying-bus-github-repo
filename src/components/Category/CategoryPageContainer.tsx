
import React, { useEffect, useRef } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { useArticlePagination } from '@/hooks/useArticlePagination';
import { useCategoryData } from '@/hooks/category/useCategoryData';
import { useCategoryFilters } from '@/hooks/category/useCategoryFilters';
import { getCategoryColorClass } from '@/utils/category/categoryHelpers';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { getCategoryByPath, categoryRoutes } from '@/utils/navigation/categoryRoutes';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';

interface CategoryPageContainerProps {
  category?: string;
}

const CategoryPageContainer: React.FC<CategoryPageContainerProps> = ({ category: propCategory }) => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  const prevCategoryRef = useRef<string | null>(null);
  
  const pathCategory = location.pathname.split('/')[1];
  const routeCategory = getCategoryByPath(location.pathname);

  if (pathCategory === 'in-the-neighborhood') {
    logger.info(LogSource.APP, 'Redirecting from legacy URL to canonical URL');
    return <Navigate to="/neighborhood" replace />;
  }

  const categorySlug = propCategory || categoryId || routeCategory?.slug || pathCategory;

  const {
    categoryData,
    displayCategory,
    availableReadingLevels,
    isLoadingCategory,
    error: categoryError
  } = useCategoryData(categorySlug);

  const {
    articles: paginatedArticles,
    isLoading: isLoadingArticles,
    stableLoading,
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

  useEffect(() => {
    // Only set category if we have valid category data and it's different from before
    if (categoryData?.id && prevCategoryRef.current !== categoryData.id) {
      prevCategoryRef.current = categoryData.id;
      setCategory(categoryData.id);
      logger.info(LogSource.APP, `Category loaded and set: ${displayCategory}`);
    }
  }, [categoryData?.id, displayCategory, setCategory]);

  if (categoryError) {
    return (
      <div className="max-w-6xl mx-auto">
        <NotFoundMessage 
          title="Error Loading Category"
          message="We couldn't load the content for this category. Please try again later."
        />
      </div>
    );
  }

  if (!isLoadingCategory && !categoryData) {
    logger.warn(LogSource.APP, `Category not found: ${categorySlug}`);
    return (
      <div className="max-w-6xl mx-auto">
        <NotFoundMessage 
          title="Category Not Found"
          message="Sorry, we couldn't find the category you're looking for."
        />
      </div>
    );
  }

  const colorClass = getCategoryColorClass(displayCategory, categoryData?.color);
  const hasActiveFilters = selectedReadingLevel !== null || currentPage > 1;

  return (
    <div className="max-w-6xl mx-auto">
      <ErrorBoundary 
        component="CategoryPageContent"
        fallback={
          <div className="p-6 bg-red-50 rounded-lg border border-red-200">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error displaying category content</h3>
            <p className="text-red-600">There was a problem loading the articles for this category.</p>
          </div>
        }
      >
        <CategoryPageContent 
          displayCategory={displayCategory} 
          colorClass={colorClass}
          breadcrumbItems={[
            { label: 'Home', href: '/' },
            { label: displayCategory || '', active: true }
          ]}
          sortBy={isLoadingArticles ? 'newest' : 'newest'}
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
          isLoading={isLoadingArticles}
          stableLoading={stableLoading}
        />
      </ErrorBoundary>
    </div>
  );
};

export default CategoryPageContainer;
