import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { getCategoryBySlug } from '@/utils/navigation/categoryRoutes';
import { fetchCategoryBySlug } from '@/utils/categoryUtils';
import { ArticleProps } from '@/components/Articles/ArticleCard';

/**
 * Convert a slug to a display category name with improved error handling
 */
export const getCategoryFromSlug = async (slug: string | undefined): Promise<string | null> => {
  if (!slug) {
    logger.warn(LogSource.APP, 'No slug provided to getCategoryFromSlug');
    return null;
  }
  
  try {
    // Log the incoming slug for debugging
    logger.info(LogSource.APP, `Resolving category for slug: ${slug}`);
    
    // First try to get category from database
    const category = await fetchCategoryBySlug(slug);
    
    if (category?.name) {
      logger.info(LogSource.APP, `Category found in database: ${category.name}`);
      return category.name;
    }
    
    // If not found in database, try local mapping
    const localCategory = getCategoryBySlug(slug);
    if (localCategory) {
      logger.info(LogSource.APP, `Category found in local mapping: ${localCategory.name}`);
      return localCategory.name;
    }
    
    // Try resolving with normalized slug
    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-');
    if (normalizedSlug !== slug) {
      const normalizedCategory = await fetchCategoryBySlug(normalizedSlug);
      if (normalizedCategory?.name) {
        logger.info(LogSource.APP, `Category found with normalized slug: ${normalizedCategory.name}`);
        return normalizedCategory.name;
      }
    }
    
    // Log warning if category not found
    logger.warn(LogSource.APP, `Category not found for any slug variation: ${slug}`);
    return null;
    
  } catch (error) {
    logger.error(LogSource.APP, `Error getting category from slug: ${slug}`, error);
    return null;
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
