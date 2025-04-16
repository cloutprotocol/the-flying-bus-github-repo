
export type ArticleSortType = 'newest' | 'oldest' | 'a-z';

export interface ArticleData {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  categorySlug: string;
  categoryColor: string;
  categoryId: string;
  readingLevel: string;
  readTime: number;
  author: string;
  date: string;
  publishDate: string;
  articleType: string;
}

export interface UseArticlePaginationReturn {
  articles: ArticleData[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  filters: any;
  updateFilters: (newFilters: any) => void;
  setPage: (page: number) => void;
  setCategory: (categoryId: string) => void;
  setReadingLevel: (readingLevel: string | null) => void;
  setSortBy: (sortBy: ArticleSortType) => void;
  setSearchQuery: (searchQuery: string) => void;
  clearFilters: () => void;
}
