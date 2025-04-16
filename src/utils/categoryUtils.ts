
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';

/**
 * Fetch all available categories from Supabase
 */
export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, color, icon')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
};

/**
 * Fetch category by slug from Supabase
 */
export const fetchCategoryBySlug = async (slug: string) => {
  if (!slug) return null;
  
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, color, icon')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('Error fetching category by slug:', error);
    return null;
  }

  return data;
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
  
  // Start building the query
  let query = supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      content, 
      cover_image, 
      categories!inner(id, name, slug), 
      profiles(id, display_name),
      created_at,
      published_at,
      count: count() over ()
    `, { count: 'exact' })
    .eq('categories.id', categoryId)
    .eq('status', 'published');
    
  // Apply reading level filter if provided
  if (readingLevel) {
    query = query.eq('reading_level', readingLevel);
  }
  
  // Apply sorting
  switch (sortBy) {
    case 'newest':
      query = query.order('published_at', { ascending: false });
      break;
    case 'oldest':
      query = query.order('published_at', { ascending: true });
      break;
    case 'a-z':
      query = query.order('title', { ascending: true });
      break;
  }
  
  // Apply pagination
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching articles by category:', error);
    return { articles: [], count: 0 };
  }
  
  // Transform the data to match ArticleProps
  const articles: ArticleProps[] = data.map(article => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt || '',
    imageUrl: article.cover_image,
    category: article.categories?.name || '',
    readingLevel: 'Intermediate', // Default for now until we have reading levels in database
    readTime: 5, // Default reading time until we calculate it
    author: article.profiles?.display_name || 'Unknown',
    date: new Date(article.published_at || article.created_at).toLocaleDateString(),
    publishDate: new Date(article.published_at || article.created_at).toLocaleDateString()
  }));
  
  return { articles, count: count || 0 };
};

/**
 * Fetch available reading levels for a category
 */
export const fetchReadingLevelsForCategory = async (categoryId: string | null) => {
  if (!categoryId) return [];
  
  const { data, error } = await supabase
    .from('articles')
    .select('reading_level')
    .eq('category_id', categoryId)
    .eq('status', 'published');
    
  if (error) {
    console.error('Error fetching reading levels:', error);
    return [];
  }
  
  // Extract unique reading levels
  const uniqueLevels = [...new Set(data.map(item => item.reading_level).filter(Boolean))];
  return uniqueLevels;
};
