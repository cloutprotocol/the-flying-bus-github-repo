// Supabase query builder removed; Convex is used instead

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

// Note: Convex replaces the Supabase query builder. Consumers should
// call Convex queries/mutations directly with filters.
