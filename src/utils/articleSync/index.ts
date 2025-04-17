
import { getCachedArticle, setCachedArticle, clearArticleCache } from './cacheManager';
import { fetchArticleFromAPI } from './articleFetcher';
import { ArticleProps } from '@/components/Articles/ArticleCard';

export const fetchArticleWithCache = async (articleId: string): Promise<ArticleProps | null> => {
  const cachedArticle = getCachedArticle(articleId);
  
  if (cachedArticle) {
    return cachedArticle;
  }
  
  try {
    console.log('Fetching article from API:', articleId);
    const article = await fetchArticleFromAPI(articleId);
    
    if (article) {
      setCachedArticle(articleId, article);
    }
    
    return article;
  } catch (error) {
    console.error('Error fetching article with cache:', error);
    return null;
  }
};

export const fetchArticlesByCategoryWithCache = async (
  categoryId: string,
  limit: number = 6
): Promise<ArticleProps[]> => {
  const cacheKey = `category-${categoryId}-${limit}`;
  const cachedArticles = getCachedArticle(cacheKey);
  
  if (cachedArticles) {
    return [cachedArticles];
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

    const articles = data.map(article => validateAndTransformArticle(article));
    
    // Cache the first article as a representative for the category
    if (articles.length > 0) {
      setCachedArticle(cacheKey, articles[0]);
    }
    
    return articles;
  } catch (error) {
    console.error('Error in fetchArticlesByCategoryWithCache:', error);
    return [];
  }
};

export { clearArticleCache };
