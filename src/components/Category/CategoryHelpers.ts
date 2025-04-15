
import { ArticleProps } from '@/components/Articles/ArticleCard';

/**
 * Convert a slug to a display category name
 * @param slug The URL slug to convert
 * @returns The formatted category name
 */
export const getCategoryFromSlug = (slug: string | undefined): string | null => {
  if (!slug) return null;
  
  // Map of URL slugs to category display names
  const categoryMap: Record<string, string> = {
    'headliners': 'Headliners',
    'debates': 'Debates',
    'spice-it-up': 'Spice It Up',
    'storyboard': 'Storyboard',
    'in-the-neighborhood': 'In the Neighborhood',
    'learning': 'Learning',
    'school-news': 'School News',
    // Add aliases for hyphenated URLs
    'neighborhood': 'In the Neighborhood',
    'spice': 'Spice It Up',
    'school': 'School News'
  };
  
  // Convert to lowercase to make the lookup case-insensitive
  const normalizedSlug = slug.toLowerCase();
  
  return categoryMap[normalizedSlug] || null;
};

/**
 * Filter and sort articles based on selected criteria
 * @param articles The articles to filter and sort
 * @param readingLevel The reading level to filter by (or null for all)
 * @param sortBy The sorting criteria
 * @returns Filtered and sorted articles
 */
export const filterAndSortArticles = (
  articles: ArticleProps[],
  readingLevel: string | null,
  sortBy: 'newest' | 'oldest' | 'a-z'
): ArticleProps[] => {
  // Filter by reading level if provided
  let filteredArticles = readingLevel 
    ? articles.filter(article => article.readingLevel === readingLevel)
    : articles;
  
  // Sort the filtered articles
  return [...filteredArticles].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'a-z':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
};

/**
 * Paginate articles based on current page and items per page
 * @param articles The articles to paginate
 * @param currentPage The current page number (1-based)
 * @param itemsPerPage Number of items per page
 * @returns Paginated articles for the current page
 */
export const paginateArticles = (
  articles: ArticleProps[],
  currentPage: number,
  itemsPerPage: number
): ArticleProps[] => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return articles.slice(startIndex, endIndex);
};
