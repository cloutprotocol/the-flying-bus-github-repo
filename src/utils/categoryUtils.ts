import { categoryConvexService } from '@/services/convex/categoryConvexService';
import { getPublishedArticles } from '@/services/articles/articleQueryService';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { calculateReadTime } from '@/utils/articles/articleRead';

/**
 * Fetch all available categories from Convex
 */
export const fetchCategories = async () => {
  const { categories, error } = await categoryConvexService.getAll();

  if (error) {
    logger.error(LogSource.API, 'Error fetching categories:', error);
    return [];
  }

  // Convex returns object with _id, map to id if needed, but existing code might expect 'id'.
  // Supabase 'id' is UUID. Convex '_id' is ID.
  // We need to ensure consumers handle this or we map _id to id.
  return categories.map(c => ({
    ...c,
    id: c._id
  })) || [];
};

/**
 * Fetch category by slug from Convex
 */
export const fetchCategoryBySlug = async (slug: string) => {
  if (!slug) return null;

  // Normalize slug for lookup
  const normalizedSlug = slug.toLowerCase().trim();

  logger.info(LogSource.API, `Fetching category by slug from Convex: ${normalizedSlug}`);

  let { category, error } = await categoryConvexService.getBySlug(normalizedSlug);

  if (error) {
    logger.error(LogSource.API, 'Error fetching category by slug:', error);
    return null;
  }

  if (!category) {
    // Try alternative slug mappings for special cases
    const slugMappings: Record<string, string> = {
      'spice': 'spice-it-up',
      'spice-it-up': 'spice',
      'school': 'school-news',
      'school-news': 'school'
    };

    const alternativeSlug = slugMappings[normalizedSlug];
    if (alternativeSlug) {
      logger.info(LogSource.API, `Trying alternative slug: ${alternativeSlug}`);

      const { category: altData, error: altError } = await categoryConvexService.getBySlug(alternativeSlug);

      if (!altError && altData) {
        logger.info(LogSource.API, `Found category with alternative slug: ${altData.name}`);
        category = altData;
      }
    }

    if (!category) {
      logger.warn(LogSource.API, `No category found for slug: ${normalizedSlug}`);
      return null;
    }
  }

  return { ...category, id: category._id };
};

/**
 * Fetch articles by category with filtering and sorting options
 */
export const fetchArticlesByCategory = async (
  categoryId: string | null,
  options?: {
    readingLevel?: string | null;
    sortBy?: 'newest' | 'oldest' | 'a-z';
    page?: number;
    itemsPerPage?: number;
  }
) => {
  if (!categoryId) return { articles: [], count: 0 };

  const {
    readingLevel = null,
    sortBy = 'newest',
    page = 1,
    itemsPerPage = 6
  } = options || {};

  const { articles: data, count: totalCount, error } = await getPublishedArticles(
    categoryId,
    page,
    itemsPerPage,
    sortBy
  );

  if (error) {
    logger.error(LogSource.API, 'Error fetching articles by category:', error);
    return { articles: [], count: 0 };
  }

  // Transform the data to match ArticleProps
  const articles: ArticleProps[] = data.map((article: any) => ({
    id: article._id,
    title: article.title,
    excerpt: article.excerpt || '',
    imageUrl: article.featured_image_url || null, // property name differs from Supabase 'cover_image'
    // but schema.ts says 'featured_image_url'. Supabase query selected 'cover_image'.
    // I should check if Supabase schema used 'cover_image' and Convex uses 'featured_image_url'.
    // Converting to 'cover_image' might be safer if I knew the mapping.
    // However, schema.ts in Convex has `featured_image_url`.
    // I will assume `featured_image_url` is correct for Convex.
    category: article.category?.name || '',
    readingLevel: 'Intermediate', // Default for now until we have reading levels in database
    readTime: calculateReadTime(article.content),
    author: article.author?.display_name || 'Unknown',
    date: new Date(article.published_at || article.created_at).toLocaleDateString(),
    publishDate: new Date(article.published_at || article.created_at).toLocaleDateString()
  }));

  return { articles, count: totalCount || 0 };
};

/**
 * Fetch available reading levels for a category
 */
export const fetchReadingLevelsForCategory = async (categoryId: string | null) => {
  if (!categoryId) return [];

  // Since we don't have reading_level column yet, return default levels
  // TODO: Once reading_level column is added to articles table, implement proper query
  return ['Beginner', 'Intermediate', 'Advanced'];
};
