
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

interface CategoryMapping {
  id: string;
  name: string;
  slug: string;
}

let categoryCache: CategoryMapping[] | null = null;

export const getCategoryBySlug = async (slug: string): Promise<CategoryMapping | null> => {
  try {
    // Use cache if available
    if (!categoryCache) {
      const convexUrl = import.meta.env.VITE_CONVEX_URL!;
      const convex = new ConvexHttpClient(convexUrl);
      const categories = await convex.query(api.categories.getAll, {});
      categoryCache = (categories || []).map((c: any) => ({ id: c._id, name: c.name, slug: c.slug }));
    }

    // Find direct match first
    let category = categoryCache.find(cat => cat.slug === slug);
    
    // If no direct match, try common slug mappings
    if (!category) {
      const slugMappings: Record<string, string> = {
        'in-the-neighborhood': 'neighborhood',
        'spice': 'spice-it-up',
        'school': 'school-news'
      };
      
      const mappedSlug = slugMappings[slug];
      if (mappedSlug) {
        category = categoryCache.find(cat => cat.slug === mappedSlug);
      }
    }
    
    return category || null;
  } catch (error) {
    logger.error(LogSource.EDITOR, 'Exception in getCategoryBySlug', error);
    return null;
  }
};

export const clearCategoryCache = () => {
  categoryCache = null;
};
