
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const createArticle = async (articleData: any) => {
  try {
    logger.info(LogSource.ARTICLE, 'Creating new article');

    const articleId = await convexClient.mutation(api.articles.create, {
      title: articleData.title,
      slug: articleData.slug,
      content: articleData.content,
      excerpt: articleData.excerpt,
      article_type: articleData.article_type,
      author_id: articleData.author_id as Id<"profiles">,
      category_id: articleData.category_id as Id<"categories"> | undefined,
      featured_image_url: articleData.featured_image_url,
      thumbnail_url: articleData.thumbnail_url,
      reading_time: articleData.reading_time,
      difficulty_level: articleData.difficulty_level,
      age_range: articleData.age_range,
      status: articleData.status,
      published_at: articleData.published_at,
      scheduled_for: articleData.scheduled_for,
      meta_title: articleData.meta_title,
      meta_description: articleData.meta_description,
      meta_keywords: articleData.meta_keywords,
    });

    return { data: { _id: articleId, ...articleData }, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception creating article', e);
    return { data: null, error: e };
  }
};

export const updateArticle = async (articleId: string, updates: any) => {
  try {
    logger.info(LogSource.ARTICLE, `Updating article ${articleId}`);

    await convexClient.mutation(api.articles.update, {
      id: articleId as Id<"articles">,
      title: updates.title,
      slug: updates.slug,
      content: updates.content,
      excerpt: updates.excerpt,
      category_id: updates.category_id as Id<"categories"> | undefined,
      featured_image_url: updates.featured_image_url,
      thumbnail_url: updates.thumbnail_url,
      reading_time: updates.reading_time,
      difficulty_level: updates.difficulty_level,
      age_range: updates.age_range,
      status: updates.status,
      published_at: updates.published_at,
      scheduled_for: updates.scheduled_for,
      meta_title: updates.meta_title,
      meta_description: updates.meta_description,
      meta_keywords: updates.meta_keywords,
    });

    return { data: { _id: articleId, ...updates }, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception updating article', e);
    return { data: null, error: e };
  }
};

export const deleteArticle = async (articleId: string): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.ARTICLE, `Deleting article ${articleId}`);

    await convexClient.mutation(api.articles.remove, {
      id: articleId as Id<"articles">,
    });

    logger.info(LogSource.ARTICLE, `Article deleted successfully: ${articleId}`);
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception deleting article', e);
    return { success: false, error: e };
  }
};
