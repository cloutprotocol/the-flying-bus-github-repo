
import { ArticleData } from './types';

export function transformArticleData(articles: any[]): ArticleData[] {
  return articles.map(article => {
    // Handle category data
    const categoryName = article.category || 'Uncategorized';
    const categorySlug = article.categories?.slug || article.categorySlug || 'uncategorized';
    const categoryColor = article.categories?.color?.split('-')[1] || 'blue';
    const categoryId = article.category_id || article.categoryId || null;
    
    return {
      id: article.id,
      title: article.title || 'Untitled Article',
      excerpt: article.excerpt || '',
      content: article.content,
      imageUrl: article.cover_image || null,
      category: article.categories?.name || categoryName,
      categorySlug: categorySlug,  // Add missing property
      categoryColor: categoryColor, // Add missing property
      categoryId: categoryId,       // Add missing property
      readingLevel: article.reading_level || 'All Ages',
      readTime: calculateReadTime(article.content) || 3,
      author: article.author_name || 'Unknown Author',
      date: formatDate(article.published_at || article.created_at),
      publishDate: article.published_at ? formatDate(article.published_at) : null,
      commentCount: article.comment_count || 0,
      videoUrl: article.video_url || null,
      slug: article.slug || '',
      articleType: article.article_type || 'standard'  // Add missing property
    };
  });
}

function calculateReadTime(content?: string): number {
  if (!content) return 2;
  
  // Average reading speed: 200 words per minute
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown Date';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return 'Invalid Date';
  }
}
