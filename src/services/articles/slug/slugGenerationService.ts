import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Generate a unique slug for an article
 */
export const generateUniqueSlug = async (title: string | undefined, articleId?: string): Promise<string> => {
  // If title is undefined or empty, use a timestamp-based fallback
  if (!title || title.trim() === '') {
    return `draft-${Date.now()}`;
  }
  
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
    
  // Add timestamp to ensure uniqueness
  const timestamp = new Date().getTime().toString().slice(-6);
  const proposedSlug = `${baseSlug}-${timestamp}`;
  
  // If we have an article ID, check if this slug already exists
  if (articleId) {
    const { data: existingArticle, error } = await supabase
      .from('articles')
      .select('slug')
      .eq('id', articleId)
      .single();
      
    // If article already has a slug, we can keep it
    if (!error && existingArticle && existingArticle.slug) {
      return existingArticle.slug;
    }
  }
  
  return proposedSlug;
};
