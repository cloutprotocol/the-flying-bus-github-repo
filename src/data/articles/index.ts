
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { StoryboardArticleProps } from '@/data/articles/storyboard';
import logger from '@/utils/logger';
import { LogSource } from '@/utils/logger';

// Mock data for related articles and functionality that isn't connected to Supabase yet
export const mockArticles: ArticleProps[] = [
  {
    id: "1",
    title: "Kids from Around the World Unite for Climate Change Action",
    excerpt: "Young activists from over 20 countries participated in a virtual summit to discuss and propose solutions for climate change.",
    imageUrl: "https://images.unsplash.com/photo-1604326531570-2689ea7ae287?w=800&auto=format&fit=crop",
    category: "Headliners",
    readingLevel: "Intermediate",
    readTime: 5,
    author: "Jamie Fields",
    date: "March 15, 2025",
    publishDate: "March 15, 2025",
    commentCount: 12
  },
  {
    id: "2",
    title: "Should School Uniforms Be Mandatory?",
    excerpt: "Students debate the pros and cons of requiring uniforms in schools.",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop",
    category: "Debates",
    readingLevel: "Beginner",
    readTime: 3,
    author: "Alex Chen",
    date: "March 10, 2025",
    publishDate: "March 10, 2025",
    commentCount: 28
  },
  {
    id: "3",
    title: "DIY Science Experiments You Can Do at Home",
    excerpt: "Learn how to create amazing science experiments with everyday household items.",
    imageUrl: "https://images.unsplash.com/photo-1603356033288-acfcb54801e6?w=800&auto=format&fit=crop",
    category: "Learning",
    readingLevel: "Advanced",
    readTime: 7,
    author: "Dr. Emma Wright",
    date: "March 5, 2025",
    publishDate: "March 5, 2025"
  }
];

export const getHeadlineArticle = async (): Promise<ArticleProps | null> => {
  try {
    logger.info(LogSource.ARTICLE, 'Fetching headline article');
    
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        content, 
        cover_image, 
        categories(id, name), 
        profiles!articles_author_id_fkey(id, display_name),
        created_at,
        published_at
      `)
      .eq('featured', true)
      .eq('status', 'published')
      .limit(1)
      .single();

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching headline article', error);
      return null;
    }

    if (!data) {
      logger.info(LogSource.ARTICLE, 'No featured headline article found');
      return null;
    }

    logger.info(LogSource.ARTICLE, 'Headline article fetched successfully', { id: data.id });

    return {
      id: data.id,
      title: data.title,
      excerpt: data.excerpt || '',
      imageUrl: data.cover_image,
      category: data.categories?.name || '',
      readingLevel: 'Intermediate', // Default for now
      readTime: 5, // Default reading time
      author: data.profiles?.display_name || 'Unknown',
      date: new Date(data.published_at || data.created_at).toLocaleDateString(),
      publishDate: data.published_at ? new Date(data.published_at).toLocaleDateString() : null
    };
  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception fetching headline article', error);
    return null;
  }
};

export const getCategoryArticles = async (categoryName: string): Promise<ArticleProps[]> => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching articles for category: ${categoryName}`);
    
    // First get the category ID matching the provided name
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (categoryError || !categoryData) {
      logger.error(LogSource.ARTICLE, `Error finding category with name ${categoryName}`, categoryError);
      return [];
    }

    const categoryId = categoryData.id;
    
    // Then fetch articles belonging to this category
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        cover_image, 
        categories(id, name), 
        profiles!articles_author_id_fkey(id, display_name),
        created_at,
        published_at
      `)
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);

    if (error) {
      logger.error(LogSource.ARTICLE, `Error fetching articles for category ${categoryName}`, error);
      return [];
    }

    if (!data || data.length === 0) {
      logger.info(LogSource.ARTICLE, `No articles found for category ${categoryName}`);
      return [];
    }

    logger.info(LogSource.ARTICLE, `${data.length} articles fetched for category ${categoryName}`);

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
      publishDate: article.published_at ? new Date(article.published_at).toLocaleDateString() : null
    }));
  } catch (error) {
    logger.error(LogSource.ARTICLE, `Exception fetching articles for category ${categoryName}`, error);
    return [];
  }
};

// Get article by ID
export const getArticleById = (id: string): ArticleProps | StoryboardArticleProps | undefined => {
  // For now, we'll use mock data. Later this will fetch from Supabase
  return mockArticles.find(article => article.id === id);
};

// Check if an article is a storyboard article
export const isStoryboardArticle = (article: ArticleProps): boolean => {
  return article.category === 'Storyboard';
};

// Function to get comments for an article (placeholder)
export const getCommentsByArticleId = (articleId: string) => {
  // Mock comments data
  return [];
};
