
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';

export const getHeadlineArticle = async (): Promise<ArticleProps | null> => {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      content, 
      cover_image, 
      categories(name), 
      profiles(display_name),
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
      categories(name), 
      profiles(display_name),
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
