
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { fetchCategoryBySlug } from '@/utils/categoryUtils';

/**
 * Convert a slug to a display category name
 * @param slug The URL slug to convert
 * @returns The formatted category name
 */
export const getCategoryFromSlug = async (slug: string | undefined): Promise<string | null> => {
  if (!slug) return null;
  
  try {
    const category = await fetchCategoryBySlug(slug);
    return category?.name || null;
  } catch (error) {
    console.error('Error getting category from slug:', error);
    
    // Fallback to local mapping if API fails
    const categoryMap: Record<string, string> = {
      'headliners': 'Headliners',
      'debates': 'Debates',
      'spice-it-up': 'Spice It Up',
      'storyboard': 'Storyboard',
      'in-the-neighborhood': 'In the Neighborhood',
      'learning': 'Learning',
      'school-news': 'School News',
      'neighborhood': 'In the Neighborhood',
      'spice': 'Spice It Up',
      'school': 'School News'
    };
    
    // Convert to lowercase to make the lookup case-insensitive
    const normalizedSlug = slug.toLowerCase();
    
    return categoryMap[normalizedSlug] || null;
  }
};

/**
 * Filter and sort articles based on selected criteria
 * This is kept for backward compatibility
 * The actual filtering now happens on the server side
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
 * This is kept for backward compatibility
 * The actual pagination now happens on the server side
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
