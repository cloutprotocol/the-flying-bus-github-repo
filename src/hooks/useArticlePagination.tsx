
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { useToast } from '@/components/ui/use-toast';

export type ArticleSortType = 'newest' | 'oldest' | 'a-z';

export interface ArticleFilterParams {
  categoryId?: string;
  readingLevel?: string | null;
  sortBy?: ArticleSortType;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  authorId?: string;
}

export function useArticlePagination(initialFilters: ArticleFilterParams = {}) {
  const [articles, setArticles] = useState<ArticleProps[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ArticleFilterParams>({
    page: 1,
    pageSize: 6,
    sortBy: 'newest',
    ...initialFilters,
  });
  const { toast } = useToast();

  // Fetch articles based on current filters
  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build the query
        let query = supabase
          .from('articles')
          .select(`
            id, 
            title, 
            excerpt, 
            cover_image, 
            category_id,
            categories(id, name, slug, color),
            profiles(id, display_name),
            created_at,
            published_at,
            article_type
          `, { count: 'exact' })
          .eq('status', 'published');

        // Apply filters
        if (filters.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }

        if (filters.authorId) {
          query = query.eq('author_id', filters.authorId);
        }

        if (filters.searchQuery) {
          query = query.or(`title.ilike.%${filters.searchQuery}%,excerpt.ilike.%${filters.searchQuery}%`);
        }

        // Apply sorting
        switch (filters.sortBy) {
          case 'newest':
            query = query.order('published_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('published_at', { ascending: true });
            break;
          case 'a-z':
            query = query.order('title', { ascending: true });
            break;
          default:
            query = query.order('published_at', { ascending: false });
        }

        // Apply pagination
        const from = (filters.page! - 1) * filters.pageSize!;
        const to = from + filters.pageSize! - 1;
        
        query = query.range(from, to);

        // Execute the query
        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Error fetching articles: ${error.message}`);
        }

        if (count !== null) {
          setTotalCount(count);
        }

        // Transform the data
        const transformedArticles = data.map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt || '',
          imageUrl: item.cover_image,
          category: item.categories?.name || '',
          categorySlug: item.categories?.slug || '',
          categoryColor: item.categories?.color || '',
          categoryId: item.category_id,
          readingLevel: 'Intermediate', // Default until we have reading levels
          readTime: 5, // Default reading time
          author: item.profiles?.display_name || 'Unknown',
          date: new Date(item.published_at || item.created_at).toLocaleDateString(),
          publishDate: new Date(item.published_at || item.created_at).toLocaleDateString(),
          articleType: item.article_type
        }));

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
  const updateFilters = (newFilters: Partial<ArticleFilterParams>) => {
    // If changing anything other than the page, reset to page 1
    if (Object.keys(newFilters).some(key => key !== 'page')) {
      setFilters({
        ...filters,
        ...newFilters,
        page: 1,
      });
    } else {
      setFilters({
        ...filters,
        ...newFilters,
      });
    }
  };

  // Set page
  const setPage = (page: number) => {
    updateFilters({ page });
  };

  // Set category
  const setCategory = (categoryId: string) => {
    updateFilters({ categoryId });
  };

  // Set reading level
  const setReadingLevel = (readingLevel: string | null) => {
    updateFilters({ readingLevel });
  };

  // Set sort order
  const setSortBy = (sortBy: ArticleSortType) => {
    updateFilters({ sortBy });
  };

  // Set search query
  const setSearchQuery = (searchQuery: string) => {
    updateFilters({ searchQuery: searchQuery || undefined });
  };

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
    updateFilters,
    setPage,
    setCategory,
    setReadingLevel,
    setSortBy,
    setSearchQuery,
    clearFilters,
  };
}
