import React, { Suspense } from 'react';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import Breadcrumb from '@/components/Navigation/Breadcrumb';
import CategoryFilter from '@/components/Navigation/CategoryFilter';
import CategoryHeader from '@/components/Category/CategoryHeader';
import ActiveFilters from '@/components/Category/ActiveFilters';
import ArticlesGrid from '@/components/Category/ArticlesGrid';
import PaginationControls from '@/components/Category/PaginationControls';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface CategoryPageContentProps {
  displayCategory: string | null;
  colorClass: string;
  breadcrumbItems: BreadcrumbItem[];
  sortBy: 'newest' | 'oldest' | 'a-z';
  onSortChange: (value: 'newest' | 'oldest' | 'a-z') => void;
  availableReadingLevels: string[];
  selectedReadingLevel: string | null;
  onReadingLevelChange: (level: string | null) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  paginatedArticles: ArticleProps[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  stableLoading?: boolean;
}

const CategoryPageContent: React.FC<CategoryPageContentProps> = ({
  displayCategory,
  colorClass,
  breadcrumbItems,
  sortBy,
  onSortChange,
  availableReadingLevels,
  selectedReadingLevel,
  onReadingLevelChange,
  hasActiveFilters,
  clearFilters,
  paginatedArticles,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  stableLoading = false
}) => {
  if (!displayCategory) return null;
  
  return (
    <>
      {/* Category Header and Breadcrumb */}
      <div className="flex flex-col gap-4 mb-6">
        <CategoryHeader 
          displayCategory={displayCategory} 
          colorName={colorClass}
        />
        
        <Breadcrumb 
          items={breadcrumbItems} 
          className="bg-white/90 backdrop-blur-sm rounded-lg py-2 px-4 shadow-sm"
        />
      </div>
      
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <CategoryFilter 
          sortBy={sortBy}
          onSortChange={onSortChange}
          readingLevels={availableReadingLevels}
          onReadingLevelChange={onReadingLevelChange}
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
      
      {/* Articles Grid with Loading State */}
      <ArticlesGrid 
        articles={paginatedArticles}
        hasActiveFilters={hasActiveFilters}
        isLoading={isLoading}
        stableLoading={stableLoading}
      />
      
      {/* Pagination */}
      <PaginationControls 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
};

export default CategoryPageContent;
