
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import { getCategoryFromSlug } from '@/components/Category/CategoryHelpers';
import CategoryPageSkeleton from '@/components/Category/CategoryPageSkeleton';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { fetchArticlesByCategory, fetchCategoryBySlug, fetchReadingLevelsForCategory } from '@/utils/categoryUtils';

interface CategoryPageContainerProps {
  category?: string;
}

const ARTICLES_PER_PAGE = 6;

const CategoryPageContainer: React.FC<CategoryPageContainerProps> = ({ category: propCategory }) => {
  // State for sorting, filtering and pagination
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z'>('newest');
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [availableReadingLevels, setAvailableReadingLevels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginatedArticles, setPaginatedArticles] = useState<any[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [displayCategory, setDisplayCategory] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<any | null>(null);
  
  // Get the categoryId parameter from the URL
  const { categoryId } = useParams<{ categoryId: string }>();
  
  // Get path from location to determine category if not provided via props
  const location = useLocation();
  const pathCategory = location.pathname.split('/')[1];
  
  // Use prop category if provided, otherwise use parameter, then path
  const categorySlug = propCategory || categoryId || pathCategory;

  // Load category and articles data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch category data
        const category = await fetchCategoryBySlug(categorySlug);
        
        if (!category) {
          setIsLoading(false);
          return;
        }
        
        setCategoryData(category);
        setDisplayCategory(category.name);
        
        // Fetch reading levels
        const levels = await fetchReadingLevelsForCategory(category.id);
        setAvailableReadingLevels(levels);
        
        // Fetch articles with server-side filtering
        const { articles, count } = await fetchArticlesByCategory(
          category.id,
          {
            readingLevel: selectedReadingLevel,
            sortBy,
            page: currentPage,
            itemsPerPage: ARTICLES_PER_PAGE
          }
        );
        
        setPaginatedArticles(articles);
        setTotalArticles(count);
      } catch (error) {
        console.error('Error fetching category data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [categorySlug, selectedReadingLevel, sortBy, currentPage]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, selectedReadingLevel]);
  
  // If no category found, show not found message
  if (!isLoading && !categoryData) {
    return (
      <MainLayout>
        <NotFoundMessage 
          title="Category Not Found"
          message="Sorry, we couldn't find the category you're looking for."
        />
      </MainLayout>
    );
  }
  
  // Calculate total pages
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  
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

  // Clear all filters
  const clearFilters = () => {
    setSelectedReadingLevel(null);
    setSortBy('newest');
  };

  const hasActiveFilters = selectedReadingLevel !== null || sortBy !== 'newest';

  // Render loading skeleton when data is loading
  if (isLoading) {
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
          sortBy={sortBy}
          onSortChange={setSortBy}
          availableReadingLevels={availableReadingLevels}
          selectedReadingLevel={selectedReadingLevel}
          onReadingLevelChange={handleReadingLevelChange}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          paginatedArticles={paginatedArticles}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </MainLayout>
  );
};

export default CategoryPageContainer;
