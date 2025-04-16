
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import CategoryPageSkeleton from '@/components/Category/CategoryPageSkeleton';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { fetchCategoryBySlug, fetchReadingLevelsForCategory } from '@/utils/categoryUtils';
import { useArticlePagination, ArticleSortType } from '@/hooks/useArticlePagination';
import { handleApiError } from '@/utils/apiErrorHandler';

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
        
        // Fetch category data
        const category = await fetchCategoryBySlug(categorySlug);
        
        if (!category) {
          setIsLoadingCategory(false);
          return;
        }
        
        setCategoryData(category);
        setDisplayCategory(category.name);
        setCategory(category.id);
        
        // Fetch reading levels
        try {
          const levels = await fetchReadingLevelsForCategory(category.id);
          setAvailableReadingLevels(levels);
        } catch (levelsError) {
          console.error('Error fetching reading levels:', levelsError);
          // Don't block category display for reading levels error
        }
      } catch (error) {
        console.error('Error fetching category data:', error);
        handleApiError(error);
      } finally {
        setIsLoadingCategory(false);
      }
    };
    
    fetchData();
  }, [categorySlug, setCategory]);
  
  // Update reading level filter
  useEffect(() => {
    setReadingLevel(selectedReadingLevel);
  }, [selectedReadingLevel, setReadingLevel]);
  
  // If no category found, show not found message
  if (!isLoadingCategory && !isLoading && !categoryData) {
    return (
      <MainLayout>
        <NotFoundMessage 
          title="Category Not Found"
          message="Sorry, we couldn't find the category you're looking for."
        />
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
    setSelectedReadingLevel(level);
  };

  // Handle sort change
  const handleSortChange = (sort: ArticleSortType) => {
    setSortBy(sort);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedReadingLevel(null);
    clearFilters();
  };

  const hasActiveFilters = selectedReadingLevel !== null || currentPage > 1;

  // Render loading skeleton when data is loading
  if ((isLoadingCategory || isLoading) && !paginatedArticles.length) {
    return <CategoryPageSkeleton />;
  }

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
