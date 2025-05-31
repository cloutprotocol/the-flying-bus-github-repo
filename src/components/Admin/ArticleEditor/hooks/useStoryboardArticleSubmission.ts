import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { StoryboardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { UnifiedSubmissionService } from '@/services/articles/unifiedSubmissionService';
import { ArticleFormData, StoryboardEpisode } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface UseStoryboardArticleSubmissionProps {
  form: UseFormReturn<StoryboardArticleFormData>;
  articleId?: string;
}

export const useStoryboardArticleSubmission = ({ form, articleId }: UseStoryboardArticleSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);

  const convertToArticleFormData = (data: StoryboardArticleFormData): ArticleFormData => {
    // Convert episodes to ensure required fields are present
    const episodes: StoryboardEpisode[] = data.storyboardEpisodes?.map(episode => ({
      title: episode.title || 'Untitled Episode',
      description: episode.description || '',
      videoUrl: episode.videoUrl || '',
      thumbnailUrl: episode.thumbnailUrl || '',
      duration: episode.duration || '',
      number: episode.number || 1,
      content: episode.content || ''
    })) || [];

    return {
      id: articleId,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || '',
      imageUrl: data.imageUrl || '',
      categoryId: data.categoryId,
      slug: data.slug || '',
      articleType: 'storyboard',
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
      storyboardEpisodes: episodes
    };
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save drafts.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();
      const convertedData = convertToArticleFormData(formData);
      
      logger.info(LogSource.ARTICLE, 'Saving storyboard article draft');
      
      const result = await UnifiedSubmissionService.saveDraft(convertedData, user.id);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Save draft error', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (data: StoryboardArticleFormData): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    logger.info(LogSource.ARTICLE, 'Starting storyboard article submission');

    try {
      const formData = convertToArticleFormData(data);
      
      const result = await UnifiedSubmissionService.submitForReview(formData, user.id);
      
      if (result.success) {
        toast({
          title: "Submission successful",
          description: "Your storyboard series has been submitted for review!",
        });
        navigate('/admin/my-articles');
      } else {
        throw new Error(result.error || 'Failed to submit article');
      }
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Submit error', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isSaving,
    handleSaveDraft,
    handleSubmit
  };
};
