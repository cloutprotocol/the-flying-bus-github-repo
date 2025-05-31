
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      
      if (error) {
        logger.error(LogSource.EDITOR, 'Error fetching categories for mapping', error);
        return null;
      }
      
      categoryCache = data || [];
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
