
export interface RelatedArticlesOptions {
  readingLevel?: string | null;
  sortBy?: 'newest' | 'oldest' | 'a-z';
  page?: number;
  itemsPerPage?: number;
}

export interface ArticleFilters {
  readingLevel?: string | null;
  sortBy?: 'newest' | 'oldest' | 'a-z';
}

