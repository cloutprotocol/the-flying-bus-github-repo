
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';

const calculateReadTime = (content: string): number => {
  if (!content) return 3;
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(1, readingTime);
};

export const validateAndTransformArticle = (rawData: any): ArticleProps => {
  if (!rawData.id || !rawData.title) {
    throw new Error('Invalid article data: missing required fields');
  }

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
    readingLevel: 'Intermediate',
    readTime: calculateReadTime(rawData.content),
    author: rawData.profiles?.display_name || 'Unknown',
    date: new Date(rawData.published_at || rawData.created_at).toLocaleDateString(),
    publishDate: new Date(rawData.published_at || rawData.created_at).toLocaleDateString(),
    articleType: rawData.article_type,
    videoUrl: rawData.video_url,
    duration: rawData.duration
  };
};

export const fetchArticleFromAPI = async (articleId: string): Promise<ArticleProps | null> => {
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
        profiles!articles_author_id_fkey(id, display_name),
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

    return validateAndTransformArticle(data);
  } catch (error) {
    console.error('Error in fetchArticleFromAPI:', error);
    throw error;
  }
};
