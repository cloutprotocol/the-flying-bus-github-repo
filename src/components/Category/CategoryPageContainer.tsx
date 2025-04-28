import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { useArticlePagination } from '@/hooks/useArticlePagination';
import { useCategoryData } from '@/hooks/category/useCategoryData';
import { useCategoryFilters } from '@/hooks/category/useCategoryFilters';
import { getCategoryColorClass } from '@/utils/category/categoryHelpers';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { getCategoryByPath } from '@/utils/navigation/categoryRoutes';

interface CategoryPageContainerProps {
  category?: string;
}

const CategoryPageContainer: React.FC<CategoryPageContainerProps> = ({ category: propCategory }) => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  
  const pathCategory = location.pathname.split('/')[1];
  const routeCategory = getCategoryByPath(location.pathname);
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

  React.useEffect(() => {
    if (categoryData?.id) {
      setCategory(categoryData.id);
      logger.info(LogSource.APP, `Category loaded: ${displayCategory}`);
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
    </div>
  );
};

export default CategoryPageContainer;
