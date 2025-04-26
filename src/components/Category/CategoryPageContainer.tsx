
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import CategoryPageSkeleton from '@/components/Category/CategoryPageSkeleton';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { fetchCategoryBySlug, fetchReadingLevelsForCategory } from '@/utils/categoryUtils';
import { useArticlePagination, ArticleSortType } from '@/hooks/useArticlePagination';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface CategoryPageContainerProps {
  category?: string;
}

const CategoryPageContainer: React.FC<CategoryPageContainerProps> = ({ category: propCategory }) => {
  // State for filtering and category data
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<string | null>(null);
  const [availableReadingLevels, setAvailableReadingLevels] = useState<string[]>([]);
  const [displayCategory, setDisplayCategory] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<any | null>(null);
  const [isLoadingCategory, setIsLoadingCategory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the categoryId parameter from the URL
  const { categoryId } = useParams<{ categoryId: string }>();
  
  // Get path from location to determine category if not provided via props
  const location = useLocation();
  const pathCategory = location.pathname.split('/')[1];
  
  // Use prop category if provided, otherwise use parameter, then path
  const categorySlug = propCategory || categoryId || pathCategory;

  // Initialize the article pagination hook
  const {
    articles: paginatedArticles,
    isLoading,
    error: articlesError,
    totalPages,
    currentPage,
    setPage,
    setSortBy,
    setCategory,
    setReadingLevel,
    clearFilters
  } = useArticlePagination({
    sortBy: 'newest' as ArticleSortType,
    pageSize: 6
  });
  
  // Load category data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingCategory(true);
        setError(null);
        
        logger.info(LogSource.API, `Fetching category data for slug: ${categorySlug}`);
        
        // Fetch category data
        const category = await fetchCategoryBySlug(categorySlug);
        
        if (!category) {
          logger.warn(LogSource.API, `Category not found for slug: ${categorySlug}`);
          setIsLoadingCategory(false);
          setError('Category not found');
          return;
        }
        
        logger.info(LogSource.API, `Category data fetched: ${category.name}`);
        setCategoryData(category);
        setDisplayCategory(category.name);
        setCategory(category.id);
        
        // Fetch reading levels
        try {
          logger.info(LogSource.API, `Fetching reading levels for category: ${category.id}`);
          const levels = await fetchReadingLevelsForCategory(category.id);
          setAvailableReadingLevels(levels);
          logger.info(LogSource.API, `Found ${levels.length} reading levels for category`);
        } catch (levelsError) {
          logger.error(LogSource.API, 'Error fetching reading levels', levelsError);
          // Don't block category display for reading levels error
        }
      } catch (error) {
        logger.error(LogSource.API, 'Error fetching category data', error);
        handleApiError(error);
        setError('Failed to load category data');
      } finally {
        setIsLoadingCategory(false);
      }
    };
    
    if (categorySlug) {
      fetchData();
    }
  }, [categorySlug, setCategory]);
  
  // Update reading level filter
  useEffect(() => {
    setReadingLevel(selectedReadingLevel);
    if (selectedReadingLevel) {
      logger.info(LogSource.CLIENT, `Reading level filter changed: ${selectedReadingLevel}`);
    }
  }, [selectedReadingLevel, setReadingLevel]);
  
  // If no category found, show not found message
  if (!isLoadingCategory && !categoryData) {
    logger.warn(LogSource.CLIENT, `Displaying not found message for category: ${categorySlug}`);
    return (
      <MainLayout>
        <NotFoundMessage 
          title="Category Not Found"
          message="Sorry, we couldn't find the category you're looking for."
        />
      </MainLayout>
    );
  }

  // If there's an error, show error message
  if (error || articlesError) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }
  
  // Get category color
  const getCategoryColorClass = (category: string | null): string => {
    if (!category) return '';
    if (!categoryData?.color) return '';
    
    return categoryData.color.replace('bg-flyingbus-', '');
  };
  
  const colorClass = getCategoryColorClass(displayCategory);
  
  // Handle reading level filter change
  const handleReadingLevelChange = (level: string | null) => {
    logger.info(LogSource.CLIENT, `Reading level changed by user: ${level || 'All Levels'}`);
    setSelectedReadingLevel(level);
  };

  // Handle sort change
  const handleSortChange = (sort: ArticleSortType) => {
    logger.info(LogSource.CLIENT, `Sort method changed by user: ${sort}`);
    setSortBy(sort);
  };

  // Clear all filters
  const handleClearFilters = () => {
    logger.info(LogSource.CLIENT, 'User cleared all filters');
    setSelectedReadingLevel(null);
    clearFilters();
  };

  const hasActiveFilters = selectedReadingLevel !== null || currentPage > 1;

  // Render loading skeleton when data is loading
  if ((isLoadingCategory || isLoading) && !paginatedArticles.length) {
    logger.info(LogSource.CLIENT, 'Displaying category page skeleton loader');
    return (
      <MainLayout fullWidth={true}>
        <div className="max-w-6xl mx-auto">
          <CategoryPageSkeleton />
        </div>
      </MainLayout>
    );
  }

  logger.info(LogSource.CLIENT, `Rendering category page: ${displayCategory}, articles: ${paginatedArticles.length}`);
  
  return (
    <MainLayout fullWidth={true}>
      <div className="max-w-6xl mx-auto">
        <CategoryPageContent 
          displayCategory={displayCategory} 
          colorClass={colorClass}
          breadcrumbItems={[
            { label: 'Home', href: '/' },
            { label: displayCategory || '', active: true }
          ]}
          sortBy={isLoading ? 'newest' : 'newest'} // Default to newest
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
    </MainLayout>
  );
};

export default CategoryPageContainer;
