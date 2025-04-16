
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { StoryboardArticleProps } from '@/data/articles/storyboard';

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
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      content, 
      cover_image, 
      categories(id, name), 
      profiles(id, display_name),
      created_at
    `)
    .eq('featured', true)
    .eq('status', 'published')
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    excerpt: data.excerpt,
    imageUrl: data.cover_image,
    category: data.categories.name,
    readingLevel: 'Intermediate', // Default for now
    readTime: 5, // Default reading time
    author: data.profiles.display_name,
    date: new Date(data.created_at).toLocaleDateString(),
    publishDate: new Date(data.created_at).toLocaleDateString()
  };
};

export const getCategoryArticles = async (categoryName: string): Promise<ArticleProps[]> => {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      cover_image, 
      categories(id, name), 
      profiles(id, display_name),
      created_at
    `)
    .eq('categories.name', categoryName)
    .eq('status', 'published')
    .limit(6);

  if (error || !data) return [];

  return data.map(article => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    imageUrl: article.cover_image,
    category: article.categories.name,
    readingLevel: 'Intermediate', // Default for now
    readTime: 5, // Default reading time
    author: article.profiles.display_name,
    date: new Date(article.created_at).toLocaleDateString(),
    publishDate: new Date(article.created_at).toLocaleDateString()
  }));
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
