
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { calculateReadTime } from '@/utils/articles/articleRead';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const getArticleById = async (articleId: string): Promise<{ article: ArticleProps | null, error: any }> => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching article with ID ${articleId}`);

    // Skip Mock IDs
    if (articleId.length < 10) {
      logger.warn(LogSource.ARTICLE, `Skipping Convex query for Mock ID: ${articleId}`);
      return { article: null, error: new Error('Mock ID') };
    }

    const data = await convexClient.query(api.articles.getById, {
      articleId: articleId as Id<"articles">,
    });

    if (!data) {
      logger.error(LogSource.ARTICLE, 'Article not found');
      return { article: null, error: new Error('Article not found') };
    }

    // Extract video information if available
    const videoUrl = (data as any).videoData?.video_url;
    const duration = (data as any).videoData?.video_duration;

    logger.info(LogSource.ARTICLE, `Article fetched successfully in service`, {
      articleId: data._id,
      category: data.category?.name,
      hasVideo: !!videoUrl,
      videoUrl: videoUrl || 'none'
    });

    // Transform the database response into the expected ArticleProps format
    const article: ArticleProps = {
      id: data._id,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content,
      imageUrl: data.featured_image_url,
      category: data.category?.name || 'Uncategorized',
      categorySlug: data.category?.slug || '',
      categoryColor: data.category?.color || 'red',
      categoryId: data.category_id,
      readingLevel: 'Intermediate', // Default value
      readTime: calculateReadTime(data.content),
      author: data.author?.display_name || 'Unknown Author',
      authorAvatar: data.author?.avatar_url || '',
      date: new Date(data.published_at || data.created_at).toLocaleDateString(),
      publishDate: data.published_at ? new Date(data.published_at).toLocaleDateString() : '',
      articleType: data.article_type || 'standard',
      videoUrl: videoUrl || undefined,
      duration: duration || undefined
    };

    return { article, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching article by ID', e);
    return { article: null, error: e };
  }
};

export const getArticlesByStatus = async (
  status: StatusType | 'all',
  categoryId?: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching articles with status ${status}`);

    const result = await convexClient.query(api.articles.getByStatus, {
      status,
      categoryId: categoryId as Id<"categories"> | undefined,
      page,
      limit,
    });


    return { articles: result.articles, error: null, count: result.count };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching articles by status', e);
    return { articles: [], error: e, count: 0 };
  }
};

export const getPublishedArticles = async (
  categoryId?: string,
  page: number = 1,
  limit: number = 10,
  sortBy?: 'newest' | 'oldest' | 'a-z'
) => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching published articles`, { categoryId, page, sortBy });

    const result = await convexClient.query(api.articles.getPublished, {
      categoryId: categoryId as Id<"categories"> | undefined,
      page,
      limit,
      sortBy
    });

    return { articles: result.articles, error: null, count: result.count };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching published articles', e);
    return { articles: [], error: e, count: 0 };
  }
};
