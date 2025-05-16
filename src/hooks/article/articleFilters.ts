import { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ArticleFilterParams {
  categoryId?: string | null;
  readingLevel?: string | null;
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'a-z';
  page?: number;
  pageSize?: number;
  forceRefresh?: boolean;
}

export function getDefaultFilters(initialFilters: Partial<ArticleFilterParams> = {}): ArticleFilterParams {
  return {
    categoryId: null,
    readingLevel: null,
    searchQuery: undefined,
    sortBy: 'newest',
    page: 1,
    pageSize: 6,
    forceRefresh: false,
    ...initialFilters
  };
}

export function updateFilters(
  currentFilters: ArticleFilterParams, 
  newFilters: Partial<ArticleFilterParams>
): ArticleFilterParams {
  // Reset to page 1 if any filter changes (except page itself)
  const shouldResetPage = 
    (newFilters.categoryId !== undefined && newFilters.categoryId !== currentFilters.categoryId) ||
    (newFilters.readingLevel !== undefined && newFilters.readingLevel !== currentFilters.readingLevel) ||
    (newFilters.searchQuery !== undefined && newFilters.searchQuery !== currentFilters.searchQuery) ||
    (newFilters.sortBy !== undefined && newFilters.sortBy !== currentFilters.sortBy);

  return {
    ...currentFilters,
    ...newFilters,
    page: shouldResetPage ? 1 : (newFilters.page || currentFilters.page),
    // Reset forceRefresh to false after it's been applied
    forceRefresh: newFilters.forceRefresh === true ? true : false
  };
}

export function buildArticleQuery(
  supabase: SupabaseClient,
  filters: ArticleFilterParams
): PostgrestFilterBuilder<any, any, any> {
  // Use explicit select with categories join to get category data
  let query = supabase
    .from('articles')
    .select(`
      id,
      title,
      excerpt,
      content,
      cover_image,
      category_id,
      published_at,
      created_at,
      author_id,
      status,
      article_type,
      categories(id, name, slug, color)
    `, { count: 'exact' })
    .eq('status', 'published');

  // Apply category filter
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  // Reading level filter is commented out since the column doesn't exist
  // We'll keep the interface intact but not apply the filter
  // if (filters.readingLevel) {
  //   query = query.eq('reading_level', filters.readingLevel);
  // }

  // Apply search filter
  if (filters.searchQuery) {
    query = query.ilike('title', `%${filters.searchQuery}%`);
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
  }

  // Apply pagination
  const startIndex = ((filters.page || 1) - 1) * (filters.pageSize || 6);
  query = query.range(
    startIndex,
    startIndex + (filters.pageSize || 6) - 1
  );

  return query;
}
