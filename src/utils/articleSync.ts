
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';

// Simple in-memory cache for articles
type ArticleCache = {
  [key: string]: {
    data: ArticleProps;
    timestamp: number;
    expiresAt: number;
  };
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// In-memory cache
const articleCache: ArticleCache = {};

/**
 * Fetch an article by ID with caching
 */
export const fetchArticleWithCache = async (articleId: string): Promise<ArticleProps | null> => {
  // Check cache first
  const now = Date.now();
  const cachedArticle = articleCache[articleId];
  
  if (cachedArticle && now < cachedArticle.expiresAt) {
    console.log('Cache hit for article:', articleId);
    return cachedArticle.data;
  }
  
  // Cache miss or expired, fetch from API
  try {
    console.log('Fetching article from API:', articleId);
    const article = await fetchArticleFromAPI(articleId);
    
    if (article) {
      // Update cache
      articleCache[articleId] = {
        data: article,
        timestamp: now,
        expiresAt: now + CACHE_DURATION
      };
    }
    
    return article;
  } catch (error) {
    console.error('Error fetching article with cache:', error);
    // If there's an error but we have stale cache, return it as fallback
    if (cachedArticle) {
      console.log('Using stale cache as fallback for article:', articleId);
      return cachedArticle.data;
    }
    return null;
  }
};

/**
 * Clear article cache
 */
export const clearArticleCache = (articleId?: string) => {
  if (articleId) {
    delete articleCache[articleId];
  } else {
    // Clear entire cache
    Object.keys(articleCache).forEach(key => {
      delete articleCache[key];
    });
  }
};

/**
 * Core function to fetch article from API with enhanced error handling
 */
const fetchArticleFromAPI = async (articleId: string): Promise<ArticleProps | null> => {
  if (!articleId) {
    console.error('Invalid article ID provided');
    return null;
  }
  
  try {
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
      console.error('Database error fetching article:', error);
      throw new Error(`Failed to fetch article: ${error.message}`);
    }

    if (!data) {
      console.warn('No article found with ID:', articleId);
      return null;
    }

    // Transform and validate the data
    return validateAndTransformArticle(data);
  } catch (error) {
    console.error('Error in fetchArticleFromAPI:', error);
    throw error;
  }
};

/**
 * Validate and transform raw article data from API
 */
const validateAndTransformArticle = (rawData: any): ArticleProps => {
  // Validate required fields
  if (!rawData.id || !rawData.title) {
    throw new Error('Invalid article data: missing required fields');
  }

  // Transform the data to match ArticleProps
  return {
    id: rawData.id,
    title: rawData.title,
    excerpt: rawData.excerpt || '',
    content: rawData.content,
    imageUrl: rawData.cover_image,
    category: rawData.categories?.name || '',
    categorySlug: rawData.categories?.slug || '',
    categoryColor: rawData.categories?.color || '',
    categoryId: rawData.category_id,
    readingLevel: 'Intermediate', // Default for now until we have reading levels
    readTime: calculateReadTime(rawData.content), // Calculate based on content length
    author: rawData.profiles?.display_name || 'Unknown',
    date: new Date(rawData.published_at || rawData.created_at).toLocaleDateString(),
    publishDate: new Date(rawData.published_at || rawData.created_at).toLocaleDateString(),
    articleType: rawData.article_type,
    // Support for video articles
    videoUrl: rawData.video_url,
    duration: rawData.duration
  };
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
 * Fetch a batch of articles by category with caching
 */
export const fetchArticlesByCategoryWithCache = async (
  categoryId: string,
  limit: number = 6
): Promise<ArticleProps[]> => {
  const cacheKey = `category-${categoryId}-${limit}`;
  const now = Date.now();
  const cachedArticles = articleCache[cacheKey];
  
  if (cachedArticles && now < cachedArticles.expiresAt) {
    console.log('Cache hit for category articles:', categoryId);
    return cachedArticles.data as unknown as ArticleProps[];
  }
  
  try {
    console.log('Fetching category articles from API:', categoryId);
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        cover_image, 
        category_id,
        categories(id, name, slug, color),
        profiles(id, display_name),
        created_at,
        published_at,
        article_type
      `)
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching articles by category:', error);
      throw new Error(`Failed to fetch category articles: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform and validate articles
    const articles = data.map(article => validateAndTransformArticle(article));
    
    // Update cache
    articleCache[cacheKey] = {
      data: articles as any,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };
    
    return articles;
  } catch (error) {
    console.error('Error in fetchArticlesByCategoryWithCache:', error);
    
    // If there's an error but we have stale cache, return it as fallback
    if (cachedArticles) {
      console.log('Using stale cache as fallback for category articles:', categoryId);
      return cachedArticles.data as unknown as ArticleProps[];
    }
    
    return [];
  }
};

/**
 * Track article view with error handling and retry
 */
export const trackArticleViewWithRetry = async (articleId: string, userId?: string, maxRetries = 2) => {
  let retries = 0;
  
  const attemptTracking = async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('article_views')
        .insert({
          article_id: articleId,
          user_id: userId || null
        });

      if (error) {
        console.error('Error tracking article view:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to track article view:', error);
      return false;
    }
  };
  
  // First attempt
  let success = await attemptTracking();
  
  // Retry if failed
  while (!success && retries < maxRetries) {
    console.log(`Retrying article view tracking (${retries + 1}/${maxRetries})...`);
    retries++;
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    success = await attemptTracking();
  }
  
  return success;
};
