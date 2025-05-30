
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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

    const { data, error } = await supabase.rpc('create_storyboard_series', {
      p_user_id: userId,
      p_series_data: request.seriesData as any,
      p_episodes_data: request.episodes as any
    });

    if (error) {
      logger.error(LogSource.DATABASE, 'Error creating storyboard series', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No response from storyboard creation function');
    }

    const result = data[0];
    
    if (!result.success) {
      logger.error(LogSource.DATABASE, 'Storyboard creation failed', {
        error: result.error_message
      });
      return {
        success: false,
        error_message: result.error_message
      };
    }

    logger.info(LogSource.DATABASE, 'Storyboard series created successfully', {
      seriesId: result.series_id,
      duration: result.duration_ms
    });

    return {
      success: true,
      series_id: result.series_id,
      duration_ms: result.duration_ms
    };

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
    const { data: series, error: seriesError } = await supabase
      .from('storyboard_series')
      .select(`
        *,
        categories(name, slug),
        profiles(display_name, username)
      `)
      .eq('id', seriesId)
      .single();

    if (seriesError) throw seriesError;

    const { data: episodes, error: episodesError } = await supabase
      .from('storyboard_episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('episode_number');

    if (episodesError) throw episodesError;

    return {
      series,
      episodes: episodes || []
    };
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Error fetching storyboard series', error);
    throw error;
  }
};

export const fetchAllStoryboardSeries = async () => {
  try {
    const { data, error } = await supabase
      .from('storyboard_series')
      .select(`
        *,
        categories(name, slug),
        profiles(display_name, username)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Error fetching storyboard series list', error);
    throw error;
  }
};
