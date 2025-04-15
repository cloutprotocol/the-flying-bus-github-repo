
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { mockArticles } from '@/data/articles';
import { getCategoryColor } from '@/utils/categoryColors';
import Breadcrumb from '@/components/Navigation/Breadcrumb';
import CategoryFilter from '@/components/Navigation/CategoryFilter';
import CategoryHeader from '@/components/Category/CategoryHeader';
import ActiveFilters from '@/components/Category/ActiveFilters';
import ArticlesGrid from '@/components/Category/ArticlesGrid';
import PaginationControls from '@/components/Category/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';
import { filterAndSortArticles, paginateArticles, getCategoryFromSlug } from '@/components/Category/CategoryHelpers';

interface CategoryPageProps {
  category?: string;
}

const ARTICLES_PER_PAGE = 6;

const CategoryPage: React.FC<CategoryPageProps> = ({ category: propCategory }) => {
  // State for sorting, filtering and pagination
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z'>('newest');
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [availableReadingLevels, setAvailableReadingLevels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get path from location to determine category if not provided via props
  const location = useLocation();
  const pathCategory = location.pathname.split('/')[1];
  
  // Use prop category if provided, otherwise use path
  const categorySlug = propCategory || pathCategory;
  
  // Get the display category name from the slug
  const displayCategory = getCategoryFromSlug(categorySlug);
  
  // Filter articles by category - wrapped in useMemo to avoid unnecessary recalculations
  const categoryArticles = useMemo(() => {
    return mockArticles.filter(article => article.category === displayCategory);
  }, [displayCategory]);
  
  // Extract and set unique reading levels on component mount
  useEffect(() => {
    const levels = [...new Set(categoryArticles.map(article => article.readingLevel))];
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
  const colorClass = getCategoryColor(displayCategory).split(' ')[0] || '';
  const colorName = colorClass.replace('bg-flyingbus-', '');
  
  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: displayCategory, active: true }
  ];

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
    return (
      <MainLayout fullWidth={true}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-10">
              <Skeleton className="h-[144px] w-[144px] rounded-md" />
              <Skeleton className="h-12 w-60" />
            </div>
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
          <Skeleton className="h-12 w-full max-w-lg mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-[300px] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="max-w-6xl mx-auto">
        {/* Category Header */}
        <div className="flex flex-col gap-4 mb-6">
          <CategoryHeader 
            displayCategory={displayCategory} 
            colorName={colorName}
          />
          
          {/* Enhanced Breadcrumb */}
          <Breadcrumb 
            items={breadcrumbItems} 
            className="bg-white/90 backdrop-blur-sm rounded-lg py-2 px-4 shadow-sm"
          />
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <CategoryFilter 
            sortBy={sortBy}
            onSortChange={setSortBy}
            readingLevels={availableReadingLevels}
            onReadingLevelChange={handleReadingLevelChange}
            selectedReadingLevel={selectedReadingLevel}
          />
        </div>

        {/* Active Filters */}
        <ActiveFilters 
          selectedReadingLevel={selectedReadingLevel}
          sortBy={sortBy}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        
        {/* Articles Grid with Suspense */}
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-[300px] w-full rounded-lg" />
            ))}
          </div>
        }>
          <ArticlesGrid 
            articles={paginatedArticles}
            hasActiveFilters={hasActiveFilters}
          />
        </Suspense>
        
        {/* Pagination */}
        <PaginationControls 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </MainLayout>
  );
};

export default CategoryPage;
