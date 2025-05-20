import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Generate a unique slug for an article
 * Optimized version that minimizes database operations
 */
export const generateUniqueSlug = async (title: string | undefined, articleId?: string): Promise<string> => {
  // If title is undefined or empty, use a timestamp-based fallback
  if (!title || title.trim() === '') {
    return `draft-${Date.now()}`;
  }
  
  // Check if article already has a slug (avoid unnecessary slug generation)
  if (articleId) {
    const { data: existingArticle, error } = await supabase
      .from('articles')
      .select('slug')
      .eq('id', articleId)
      .maybeSingle();
      
    // If article already has a slug and no error occurred, we can keep it
    if (!error && existingArticle?.slug) {
      return existingArticle.slug;
    }
  }

  // Create base slug from title - moved to client-side to reduce server load
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
    
  // Add timestamp to ensure uniqueness without needing additional DB queries
  const timestamp = Date.now().toString().slice(-8);
  return `${baseSlug}-${timestamp}`;
};
