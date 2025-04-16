
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { mockArticles } from '@/data/articles';
import CategoryPageContent from '@/components/Category/CategoryPageContent';
import { 
  filterAndSortArticles, 
  paginateArticles, 
  getCategoryFromSlug 
} from '@/components/Category/CategoryHelpers';
import CategoryPageSkeleton from '@/components/Category/CategoryPageSkeleton';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { getCategoryColor } from '@/components/Category/getCategoryColor';

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
  
  // Get the categoryId parameter from the URL
  const { categoryId } = useParams<{ categoryId: string }>();
  
  // Get path from location to determine category if not provided via props
  const location = useLocation();
  const pathCategory = location.pathname.split('/')[1];
  
  // Use prop category if provided, otherwise use parameter, then path
  const categorySlug = propCategory || categoryId || pathCategory;
  
  // Get the display category name from the slug
  const displayCategory = getCategoryFromSlug(categorySlug);
  
  // Filter articles by category - wrapped in useMemo to avoid unnecessary recalculations
  const categoryArticles = useMemo(() => {
    return mockArticles.filter(article => article.category === displayCategory);
  }, [displayCategory]);

  // If no category found, show not found message
  if (!displayCategory || categoryArticles.length === 0) {
    return (
      <MainLayout>
        <NotFoundMessage 
          title="Category Not Found"
          message="Sorry, we couldn't find the category you're looking for."
        />
      </MainLayout>
    );
  }
  
  // Extract and set unique reading levels on component mount
  useEffect(() => {
    // Extract unique reading levels from articles
    const levels = [...new Set(categoryArticles.map(article => article.readingLevel))] as string[];
    setAvailableReadingLevels(levels);
    // Simulate loading data from an API
    setTimeout(() => setIsLoading(false), 300);
  }, [categoryArticles]);

  // Apply filters and sorting - wrapped in useMemo for performance
  const filteredAndSortedArticles = useMemo(() => {
    return filterAndSortArticles(
      categoryArticles,
      selectedReadingLevel,
      sortBy
    );
  }, [categoryArticles, selectedReadingLevel, sortBy]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, selectedReadingLevel]);

  // Calculate pagination with useMemo
  const { paginatedArticles, totalPages } = useMemo(() => {
    return {
      paginatedArticles: paginateArticles(
        filteredAndSortedArticles,
        currentPage,
        ARTICLES_PER_PAGE
      ),
      totalPages: Math.ceil(filteredAndSortedArticles.length / ARTICLES_PER_PAGE)
    };
  }, [filteredAndSortedArticles, currentPage]);
  
  // Get category color
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
            { label: displayCategory, active: true }
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

// Helper function to get the category color class
const getCategoryColorClass = (category: string | null): string => {
  if (!category) return '';
  const colorClass = getCategoryColor(category).split(' ')[0] || '';
  return colorClass.replace('bg-flyingbus-', '');
};

export default CategoryPageContainer;
