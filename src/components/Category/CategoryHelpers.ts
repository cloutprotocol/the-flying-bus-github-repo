
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { getCategoryBySlug } from '@/utils/navigation/categoryRoutes';
import { fetchCategoryBySlug } from '@/utils/categoryUtils';
import { ArticleProps } from '@/components/Articles/ArticleCard';

// Cache for category resolution to reduce redundant database calls
const categoryResolutionCache: Record<string, { name: string | null; timestamp: number }> = {};
const CACHE_EXPIRY = 60 * 1000; // 1 minute in milliseconds

/**
 * Convert a slug to a display category name with improved error handling
 */
export const getCategoryFromSlug = async (slug: string | undefined): Promise<string | null> => {
  if (!slug) {
    logger.warn(LogSource.APP, 'No slug provided to getCategoryFromSlug');
    return null;
  }
  
  // Check cache first
  const now = Date.now();
  const cachedResult = categoryResolutionCache[slug];
  if (cachedResult && now - cachedResult.timestamp < CACHE_EXPIRY) {
    logger.info(LogSource.APP, `Using cached category for slug: ${slug}`);
    return cachedResult.name;
  }
  
  try {
    // Log the incoming slug for debugging
    logger.info(LogSource.APP, `Resolving category for slug: ${slug}`);
    
    // First try to get category from database
    const category = await fetchCategoryBySlug(slug);
    
    if (category?.name) {
      logger.info(LogSource.APP, `Category found in database: ${category.name}`);
      categoryResolutionCache[slug] = { name: category.name, timestamp: now };
      return category.name;
    }

    // Try with path variation for "spice-it-up" and "school-news"
    const alternativeSlug = 
      slug === 'spice' ? 'spice-it-up' : 
      slug === 'school' ? 'school-news' : null;
      
    if (alternativeSlug) {
      logger.info(LogSource.APP, `Trying alternative slug: ${alternativeSlug}`);
      const alternativeCategory = await fetchCategoryBySlug(alternativeSlug);
      if (alternativeCategory?.name) {
        logger.info(LogSource.APP, `Category found with alternative slug: ${alternativeCategory.name}`);
        categoryResolutionCache[slug] = { name: alternativeCategory.name, timestamp: now };
        return alternativeCategory.name;
      }
    }
    
    // If not found in database, try local mapping
    const localCategory = getCategoryBySlug(slug);
    if (localCategory) {
      logger.info(LogSource.APP, `Category found in local mapping: ${localCategory.name}`);
      categoryResolutionCache[slug] = { name: localCategory.name, timestamp: now };
      return localCategory.name;
    }
    
    // Try resolving with normalized slug
    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-');
    if (normalizedSlug !== slug) {
      const normalizedCategory = await fetchCategoryBySlug(normalizedSlug);
      if (normalizedCategory?.name) {
        logger.info(LogSource.APP, `Category found with normalized slug: ${normalizedCategory.name}`);
        categoryResolutionCache[slug] = { name: normalizedCategory.name, timestamp: now };
        return normalizedCategory.name;
      }
    }
    
    // Log warning if category not found
    logger.warn(LogSource.APP, `Category not found for any slug variation: ${slug}`);
    categoryResolutionCache[slug] = { name: null, timestamp: now };
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
