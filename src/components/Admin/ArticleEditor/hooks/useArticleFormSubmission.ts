
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { submitArticleOptimized } from '@/services/articles/articleSubmissionService';

interface UseArticleFormSubmissionProps {
  form: UseFormReturn<ArticleFormSchemaType>;
  articleId?: string;
}

export const useArticleFormSubmission = ({ form, articleId }: UseArticleFormSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);

  // Convert form data to ArticleFormData format for services
  // Only include fields relevant to the specific article type
  const convertToArticleFormData = (data: ArticleFormSchemaType): ArticleFormData => {
    console.log('Converting form data for article type:', data.articleType, data);
    
    const baseData = {
      id: articleId,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || '',
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      slug: data.slug || '',
      articleType: data.articleType,
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
    };

    // Add type-specific fields only when relevant
    switch (data.articleType) {
      case 'video':
        return {
          ...baseData,
          videoUrl: data.videoUrl,
        };
      
      case 'debate':
        return {
          ...baseData,
          debateSettings: data.debateSettings ? {
            question: data.debateSettings.question,
            yesPosition: data.debateSettings.yesPosition,
            noPosition: data.debateSettings.noPosition,
            votingEnabled: data.debateSettings.votingEnabled,
            voting_ends_at: data.debateSettings.voting_ends_at
          } : undefined,
        };
      
      case 'storyboard':
        return {
          ...baseData,
          storyboardEpisodes: (data.storyboardEpisodes || []).map(episode => ({
            title: episode.title,
            description: episode.description,
            videoUrl: episode.videoUrl,
            thumbnailUrl: episode.thumbnailUrl,
            duration: episode.duration,
            number: episode.number,
            content: episode.content
          }))
        };
      
      default: // 'standard'
        return baseData;
    }
  };

  // Save draft function
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
      const formData = convertToArticleFormData(form.getValues());
      console.log('Saving draft with converted data:', formData);
      
      const result = await saveDraftOptimized(user.id, formData);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('useArticleFormSubmission: Save draft error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit function
  const handleSubmit = async (data: ArticleFormSchemaType): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = convertToArticleFormData(data);
      console.log('Submitting article with converted data:', formData);
      
      const result = await submitArticleOptimized(user.id, formData, false);
      
      if (result.success) {
        toast({
          title: "Submission successful",
          description: "Your article has been submitted for review!",
        });
        navigate('/admin/my-articles');
      } else {
        throw new Error(result.error || 'Failed to submit article');
      }
    } catch (error) {
      console.error('useArticleFormSubmission: Submit error:', error);
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
    handleSubmit,
    convertToArticleFormData
  };
};
