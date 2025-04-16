
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';

/**
 * Fetch an article by its ID from Supabase
 */
export const fetchArticleById = async (articleId: string): Promise<ArticleProps | null> => {
  if (!articleId) return null;
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      content, 
      cover_image, 
      category_id,
      categories(id, name, slug, color),
      profiles(id, display_name),
      created_at,
      published_at,
      article_type
    `)
    .eq('id', articleId)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error('Error fetching article by ID:', error);
    return null;
  }

  if (!data) return null;

  // Transform the data to match ArticleProps
  return {
    id: data.id,
    title: data.title,
    excerpt: data.excerpt || '',
    content: data.content,
    imageUrl: data.cover_image,
    category: data.categories?.name || '',
    categorySlug: data.categories?.slug || '',
    categoryColor: data.categories?.color || '',
    readingLevel: 'Intermediate', // Default for now until we have reading levels
    readTime: calculateReadTime(data.content), // Calculate based on content length
    author: data.profiles?.display_name || 'Unknown',
    date: new Date(data.published_at || data.created_at).toLocaleDateString(),
    publishDate: new Date(data.published_at || data.created_at).toLocaleDateString(),
    articleType: data.article_type
  };
};

/**
 * Track an article view in Supabase
 */
export const trackArticleView = async (articleId: string, userId?: string) => {
  try {
    const { error } = await supabase
      .from('article_views')
      .insert({
        article_id: articleId,
        user_id: userId || null
      });

    if (error) {
      console.error('Error tracking article view:', error);
    }
  } catch (error) {
    console.error('Failed to track article view:', error);
  }
};

/**
 * Fetch related articles based on category
 */
export const fetchRelatedArticles = async (
  articleId: string, 
  categoryId: string, 
  limit: number = 3
): Promise<ArticleProps[]> => {
  if (!categoryId) return [];
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      cover_image, 
      categories(id, name, slug),
      profiles(id, display_name),
      created_at,
      published_at
    `)
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .neq('id', articleId) // Exclude the current article
    .limit(limit);

  if (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }

  // Transform the data to match ArticleProps
  return data.map(article => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt || '',
    imageUrl: article.cover_image,
    category: article.categories?.name || '',
    readingLevel: 'Intermediate', // Default for now
    readTime: 5, // Default reading time
    author: article.profiles?.display_name || 'Unknown',
    date: new Date(article.published_at || article.created_at).toLocaleDateString(),
    publishDate: new Date(article.published_at || article.created_at).toLocaleDateString()
  }));
};

/**
 * Calculate estimated reading time based on content length
 */
const calculateReadTime = (content: string): number => {
  if (!content) return 3; // Default if no content
  
  // Average reading speed: 200 words per minute
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  
  // Minimum reading time of 1 minute
  return Math.max(1, readingTime);
};

/**
 * Check if article is a debate article
 */
export const isDebateArticle = (articleType?: string): boolean => {
  return articleType === 'debate';
};

/**
 * Check if article is a storyboard article
 */
export const isStoryboardArticle = (articleType?: string): boolean => {
  return articleType === 'storyboard';
};

/**
 * Check if article is a video article (Spice It Up)
 */
export const isVideoArticle = (articleType?: string): boolean => {
  return articleType === 'video';
};

/**
 * Fetch debate settings for a debate article
 */
export const fetchDebateSettings = async (articleId: string) => {
  const { data, error } = await supabase
    .from('debate_articles')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error) {
    console.error('Error fetching debate settings:', error);
    return null;
  }

  return data;
};

/**
 * Fetch video details for a video article
 */
export const fetchVideoDetails = async (articleId: string) => {
  const { data, error } = await supabase
    .from('video_articles')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error) {
    console.error('Error fetching video details:', error);
    return null;
  }

  return data;
};
