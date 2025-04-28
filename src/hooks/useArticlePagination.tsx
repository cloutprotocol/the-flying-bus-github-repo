
import { useState, useEffect, useRef } from 'react';
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
  
  // Track previous category ID to prevent redundant fetches
  const prevCategoryIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isStale = false;
    const minLoadingTime = 750; // Minimum loading time in milliseconds
    
    // Skip fetch if no category is selected
    if (!filters.categoryId) {
      logger.info(LogSource.ARTICLE, 'No category ID provided, skipping fetch');
      return;
    }
    
    // Skip fetch if the category hasn't changed and we've already loaded data
    if (filters.categoryId === prevCategoryIdRef.current && articles.length > 0 && !filters.forceRefresh) {
      logger.info(LogSource.ARTICLE, 'Skipping duplicate fetch for same category', { 
        categoryId: filters.categoryId,
        prevCategoryId: prevCategoryIdRef.current
      });
      return;
    }
    
    // Generate a unique request ID
    const requestId = `fetch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    activeRequestIdRef.current = requestId;
    
    // Update the previous category ID reference
    prevCategoryIdRef.current = filters.categoryId;
    
    logger.info(LogSource.ARTICLE, `Starting fetch for category: ${filters.categoryId}`, {
      requestId,
      prevArticlesCount: articles.length
    });
    
    setStableLoading(true);
    setIsLoading(true);
    setError(null);

    const startTime = Date.now();

    const fetchArticles = async () => {
      try {
        logger.info(LogSource.ARTICLE, 'Fetching articles with filters', { 
          categoryId: filters.categoryId,
          page: filters.page,
          sortBy: filters.sortBy,
          requestId
        });
        
        const query = buildArticleQuery(supabase, filters);
        const { data, error: fetchError, count } = await query;

        // Don't update state if component unmounted
        if (isStale || !isMountedRef.current) {
          logger.info(LogSource.ARTICLE, 'Component unmounted, cancelling fetch', { requestId });
          return;
        }

        if (fetchError) {
          throw new Error(`Error fetching articles: ${fetchError.message}`);
        }

        // If this request was superseded by a newer one, don't update state
        if (activeRequestIdRef.current !== requestId) {
          logger.info(LogSource.ARTICLE, 'Request superseded, discarding results', { 
            requestId,
            activeRequestId: activeRequestIdRef.current
          });
          return;
        }

        const loadingDuration = Date.now() - startTime;
        const remainingDelay = Math.max(0, minLoadingTime - loadingDuration);

        // Ensure minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, remainingDelay));

        // Final check that component is still mounted
        if (!isStale && isMountedRef.current) {
          if (count !== null) setTotalCount(count);
          setArticles(transformArticleData(data || []));
          
          logger.info(LogSource.ARTICLE, 'Articles fetched successfully', { 
            count: data?.length || 0, 
            totalCount: count,
            requestId,
            categoryId: filters.categoryId
          });
        }
      } catch (err) {
        if (!isStale && isMountedRef.current && activeRequestIdRef.current === requestId) {
          logger.error(LogSource.ARTICLE, 'Error in useArticlePagination', err);
          setError(err instanceof Error ? err : new Error('Unknown error occurred'));
          
          toast({
            title: "Error loading articles",
            description: err instanceof Error ? err.message : "Failed to load articles",
            variant: "destructive"
          });
        }
      } finally {
        if (!isStale && isMountedRef.current && activeRequestIdRef.current === requestId) {
          setIsLoading(false);
          // Delayed removal of stable loading state for smooth transition
          setTimeout(() => {
            if (isMountedRef.current) {
              setStableLoading(false);
            }
          }, 150);
        }
      }
    };

    fetchArticles();

    return () => {
      isStale = true;
    };
  }, [filters, toast, articles.length]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / filters.pageSize!);

  // Update filters
  const updateFiltersHandler = (newFilters: Partial<ArticleFilterParams>) => {
    setFilters(prevFilters => updateFilters(prevFilters, newFilters));
  };

  // Filter convenience methods
  const setPage = (page: number) => updateFiltersHandler({ page });
  const setCategory = (categoryId: string) => {
    // Only update if category has changed
    if (categoryId !== filters.categoryId) {
      logger.info(LogSource.ARTICLE, `Setting new category: ${categoryId}`, {
        previousCategoryId: filters.categoryId
      });
      updateFiltersHandler({ categoryId, page: 1, forceRefresh: true });
    } else {
      logger.info(LogSource.ARTICLE, `Category unchanged: ${categoryId}, skipping update`);
    }
  };
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
