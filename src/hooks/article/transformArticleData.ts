
import { ArticleData } from './types';

export const transformArticleData = (data: any[]): ArticleData[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map(article => {
    // Handle author data - might be separate query or join in the future
    let authorName = 'Unknown';
    
    // Get category information from the related categories data
    const categoryName = article.categories?.name || 'Uncategorized';
    const categoryColor = article.categories?.color?.split('-')[1] || 'blue'; 
    const categorySlug = article.categories?.slug || 'uncategorized'; // Add the categorySlug property

    // Calculate estimated reading time (1 min per 200 words)
    const wordCount = article.content ? article.content.split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || '',
      content: article.content,
      imageUrl: article.cover_image,
      category: categoryName,
      categorySlug, // Include the categorySlug in the returned object
      categoryColor,
      categoryId: article.category_id,
      readingLevel: 'Intermediate', // Default reading level since column doesn't exist
      readTime: readTime || 3,
      author: authorName,
      date: new Date(article.published_at || article.created_at).toLocaleDateString(),
      publishDate: article.published_at
        ? new Date(article.published_at).toLocaleDateString()
        : null,
      articleType: article.article_type || 'standard'
    };
  });
};
