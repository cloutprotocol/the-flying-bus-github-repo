
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ArticleSortType, ArticleData, UseArticlePaginationReturn } from './article/types';
import { ArticleFilterParams, getDefaultFilters, updateFilters, buildArticleQuery } from './article/articleFilters';
import { transformArticleData } from './article/articleTransformData';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export type { ArticleSortType, ArticleData, UseArticlePaginationReturn };
export type { ArticleFilterParams };

export function useArticlePagination(initialFilters: ArticleFilterParams = {}): UseArticlePaginationReturn {
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stableLoading, setStableLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ArticleFilterParams>(getDefaultFilters(initialFilters));
  const { toast } = useToast();

  useEffect(() => {
    let isStale = false;
    const minLoadingTime = 750; // Minimum loading time in milliseconds
    
    const fetchArticles = async () => {
      if (!filters.categoryId) return;
      
      setStableLoading(true);
      setIsLoading(true);
      setError(null);

      const startTime = Date.now();

      try {
        logger.info(LogSource.ARTICLE, 'Fetching articles with filters', { 
          categoryId: filters.categoryId,
          page: filters.page,
          sortBy: filters.sortBy
        });
        
        const query = buildArticleQuery(supabase, filters);
        const { data, error: fetchError, count } = await query;

        if (fetchError) {
          throw new Error(`Error fetching articles: ${fetchError.message}`);
        }

        const loadingDuration = Date.now() - startTime;
        const remainingDelay = Math.max(0, minLoadingTime - loadingDuration);

        // Ensure minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, remainingDelay));

        if (!isStale) {
          if (count !== null) setTotalCount(count);
          setArticles(transformArticleData(data || []));
          
          logger.info(LogSource.ARTICLE, 'Articles fetched successfully', { 
            count: data?.length || 0, 
            totalCount: count
          });
        }
      } catch (err) {
        if (!isStale) {
          logger.error(LogSource.ARTICLE, 'Error in useArticlePagination', err);
          setError(err instanceof Error ? err : new Error('Unknown error occurred'));
          
          toast({
            title: "Error loading articles",
            description: err instanceof Error ? err.message : "Failed to load articles",
            variant: "destructive"
          });
        }
      } finally {
        if (!isStale) {
          setIsLoading(false);
          // Delayed removal of stable loading state for smooth transition
          setTimeout(() => setStableLoading(false), 150);
        }
      }
    };

    fetchArticles();

    return () => {
      isStale = true;
    };
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
    stableLoading,
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
