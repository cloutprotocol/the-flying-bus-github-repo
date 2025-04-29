
import { ArticleData } from './types';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export function transformArticleData(articles: any[]): ArticleData[] {
  if (!articles || !Array.isArray(articles)) {
    logger.warn(LogSource.APP, 'Invalid articles data passed to transformArticleData', { articles });
    return [];
  }
  
  return articles.map(article => {
    try {
      // Handle category data from the joined categories table
      const categoryName = article.categories?.name || 'Uncategorized';
      const categorySlug = article.categories?.slug || 'uncategorized';
      const categoryColor = article.categories?.color || 'blue';
      const categoryId = article.category_id || null;
      
      // Calculate read time based on content length
      const readTime = calculateReadTime(article.content);
      
      return {
        id: article.id,
        title: article.title || 'Untitled Article',
        excerpt: article.excerpt || '',
        content: article.content,
        imageUrl: article.cover_image || null,
        category: categoryName,
        categorySlug: categorySlug,
        categoryColor: categoryColor,
        categoryId: categoryId,
        readingLevel: article.reading_level || 'All Ages',
        readTime: readTime || 3,
        author: article.author_name || 'Unknown Author',
        date: formatDate(article.published_at || article.created_at),
        publishDate: article.published_at ? formatDate(article.published_at) : null,
        commentCount: article.comment_count || 0,
        videoUrl: article.video_url || null,
        slug: article.slug || '',
        articleType: article.article_type || 'standard'
      };
    } catch (error) {
      logger.error(LogSource.APP, 'Error transforming article data', { 
        error, 
        articleId: article?.id 
      });
      
      // Return a default object with minimal data to prevent UI crashes
      return {
        id: article?.id || 'error',
        title: article?.title || 'Error Loading Article',
        excerpt: '',
        content: '',
        imageUrl: null,
        category: 'Uncategorized',
        categorySlug: 'uncategorized',
        categoryColor: 'blue',
        categoryId: null,
        readingLevel: 'All Ages',
        readTime: 3,
        author: 'Unknown',
        date: 'Unknown Date',
        publishDate: null,
        commentCount: 0,
        videoUrl: null,
        slug: '',
        articleType: 'standard'
      };
    }
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
