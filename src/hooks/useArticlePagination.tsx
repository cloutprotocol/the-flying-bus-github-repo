
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ArticleSortType, ArticleData, UseArticlePaginationReturn } from './article/types';
import { ArticleFilterParams, getDefaultFilters, updateFilters, buildArticleQuery } from './article/articleFilters';
import { transformArticleData } from './article/transformArticleData';

export { ArticleSortType };
export type { ArticleFilterParams };

export function useArticlePagination(initialFilters: ArticleFilterParams = {}): UseArticlePaginationReturn {
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ArticleFilterParams>(getDefaultFilters(initialFilters));
  const { toast } = useToast();

  // Fetch articles based on current filters
  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build and execute the query
        const query = buildArticleQuery(supabase, filters);
        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Error fetching articles: ${error.message}`);
        }

        if (count !== null) {
          setTotalCount(count);
        }

        // Transform the data
        const transformedArticles = transformArticleData(data);
        setArticles(transformedArticles);
      } catch (err) {
        console.error('Error in useArticlePagination:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        
        toast({
          title: "Error loading articles",
          description: err instanceof Error ? err.message : "Failed to load articles",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [filters, toast]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / filters.pageSize!);

  // Update filters
  const updateFiltersHandler = (newFilters: Partial<ArticleFilterParams>) => {
    setFilters(prevFilters => updateFilters(prevFilters, newFilters));
  };

  // Filter convenience methods
  const setPage = (page: number) => updateFiltersHandler({ page });
  const setCategory = (categoryId: string) => updateFiltersHandler({ categoryId });
  const setReadingLevel = (readingLevel: string | null) => updateFiltersHandler({ readingLevel });
  const setSortBy = (sortBy: ArticleSortType) => updateFiltersHandler({ sortBy });
  const setSearchQuery = (searchQuery: string) => updateFiltersHandler({ searchQuery: searchQuery || undefined });

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      ...filters,
      readingLevel: null,
      searchQuery: undefined,
      sortBy: 'newest',
      page: 1,
    });
  };

  return {
    articles,
    isLoading,
    error,
    totalCount,
    totalPages,
    currentPage: filters.page || 1,
    filters,
    updateFilters: updateFiltersHandler,
    setPage,
    setCategory,
    setReadingLevel,
    setSortBy,
    setSearchQuery,
    clearFilters,
  };
}
