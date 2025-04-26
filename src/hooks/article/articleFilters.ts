
import { ArticleSortType } from './types';

export interface ArticleFilterParams {
  categoryId?: string;
  readingLevel?: string | null;
  sortBy?: ArticleSortType;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  authorId?: string;
}

export const getDefaultFilters = (initialFilters: Partial<ArticleFilterParams> = {}): ArticleFilterParams => {
  return {
    page: 1,
    pageSize: 6,
    sortBy: 'newest',
    ...initialFilters,
  };
};

export const updateFilters = (
  currentFilters: ArticleFilterParams, 
  newFilters: Partial<ArticleFilterParams>
): ArticleFilterParams => {
  // If changing anything other than the page, reset to page 1
  if (Object.keys(newFilters).some(key => key !== 'page')) {
    return {
      ...currentFilters,
      ...newFilters,
      page: 1,
    };
  } else {
    return {
      ...currentFilters,
      ...newFilters,
    };
  }
};

export const buildArticleQuery = (supabase: any, filters: ArticleFilterParams) => {
  let query = supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      cover_image, 
      category_id,
      categories(id, name, slug, color),
      author_id,
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

  return query;
};
