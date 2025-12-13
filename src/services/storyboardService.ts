import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

export interface StoryboardSeriesData {
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  categoryId: string;
  excerpt?: string;
  status?: string;
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface StoryboardEpisodeData {
  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  number: number;
  content?: string;
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface CreateStoryboardRequest {
  seriesData: StoryboardSeriesData;
  episodes: StoryboardEpisodeData[];
}

export interface CreateStoryboardResponse {
  success: boolean;
  error_message?: string;
  series_id?: string;
  duration_ms?: number;
}

export const createStoryboardSeries = async (
  userId: string,
  request: CreateStoryboardRequest
): Promise<CreateStoryboardResponse> => {
  try {
    logger.info(LogSource.DATABASE, 'Creating storyboard series', {
      title: request.seriesData.title,
      episodeCount: request.episodes.length
    });

    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const { seriesId } = await convex.mutation(api.storyboard.createSeriesWithEpisodes, {
      series: {
        title: request.seriesData.title,
        slug: request.seriesData.slug,
        description: request.seriesData.description,
        coverImage: request.seriesData.coverImage,
        categoryId: request.seriesData.categoryId,
        excerpt: request.seriesData.excerpt,
        status: request.seriesData.status ?? 'active',
      },
       episodes: request.episodes.map((ep) => ({
        title: ep.title,
        description: ep.description,
        videoUrl: ep.videoUrl,
        thumbnailUrl: ep.thumbnailUrl,
        duration: ep.duration,
        number: ep.number,
        content: ep.content,
      })),
    });

    logger.info(LogSource.DATABASE, 'Storyboard series created successfully', { seriesId });

    return { success: true, series_id: seriesId, duration_ms: undefined };

  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception creating storyboard series', error);
    return {
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const fetchStoryboardSeries = async (seriesId: string) => {
  try {
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const data: any = await convex.query(api.storyboard.getSeries, { seriesId: seriesId as any });
    if (!data) throw new Error('Series not found');
    return { series: data, episodes: data.episodes ?? [] };
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Error fetching storyboard series', error);
    throw error;
  }
};

export const fetchAllStoryboardSeries = async () => {
  try {
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const data = await convex.query(api.storyboard.listActive, {});
    return data || [];
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Error fetching storyboard series list', error);
    throw error;
  }
};
