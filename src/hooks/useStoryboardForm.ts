
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { createStoryboardSeries, CreateStoryboardRequest, StoryboardEpisodeData } from '@/services/storyboardService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface StoryboardFormData {
  title: string;
  description: string;
  excerpt: string;
  coverImage: string;
  categoryId: string;
  episodes: StoryboardEpisodeData[];
}

export const useStoryboardForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const addEpisode = (episodes: StoryboardEpisodeData[]): StoryboardEpisodeData[] => {
    const newEpisode: StoryboardEpisodeData = {
      title: `Episode ${episodes.length + 1}`,
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      number: episodes.length + 1,
      content: ''
    };
    
    return [...episodes, newEpisode];
  };

  const removeEpisode = (episodes: StoryboardEpisodeData[], index: number): StoryboardEpisodeData[] => {
    const newEpisodes = episodes.filter((_, i) => i !== index);
    // Renumber episodes
    return newEpisodes.map((episode, i) => ({
      ...episode,
      number: i + 1,
      title: episode.title.includes('Episode') ? `Episode ${i + 1}` : episode.title
    }));
  };

  const updateEpisode = (
    episodes: StoryboardEpisodeData[], 
    index: number, 
    updates: Partial<StoryboardEpisodeData>
  ): StoryboardEpisodeData[] => {
    return episodes.map((episode, i) => 
      i === index ? { ...episode, ...updates } : episode
    );
  };

  const submitStoryboard = async (formData: StoryboardFormData): Promise<string | null> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create a storyboard series.",
        variant: "destructive"
      });
      return null;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please provide a title for your storyboard series.",
        variant: "destructive"
      });
      return null;
    }

    if (!formData.categoryId) {
      toast({
        title: "Category required",
        description: "Please select a category for your storyboard series.",
        variant: "destructive"
      });
      return null;
    }

    if (formData.episodes.length === 0) {
      toast({
        title: "Episodes required",
        description: "Please add at least one episode to your storyboard series.",
        variant: "destructive"
      });
      return null;
    }

    setIsSubmitting(true);

    try {
      logger.info(LogSource.ARTICLE, 'Submitting storyboard series', {
        title: formData.title,
        episodeCount: formData.episodes.length
      });

      const request: CreateStoryboardRequest = {
        seriesData: {
          title: formData.title,
          slug: generateSlug(formData.title),
          description: formData.description,
          coverImage: formData.coverImage,
          categoryId: formData.categoryId,
          excerpt: formData.excerpt,
          status: 'active'
        },
        episodes: formData.episodes.map((episode, index) => ({
          ...episode,
          number: index + 1
        }))
      };

      const result = await createStoryboardSeries(user.id, request);

      if (!result.success) {
        throw new Error(result.error_message || 'Failed to create storyboard series');
      }

      toast({
        title: "Storyboard series created!",
        description: "Your storyboard series has been created successfully.",
      });

      logger.info(LogSource.ARTICLE, 'Storyboard series submitted successfully', {
        seriesId: result.series_id,
        duration: result.duration_ms
      });

      return result.series_id || null;

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Error submitting storyboard series', error);
      
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to create storyboard series. Please try again.",
        variant: "destructive"
      });

      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isSaving,
    addEpisode,
    removeEpisode,
    updateEpisode,
    submitStoryboard
  };
};
