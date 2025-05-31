
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { ArticleFormSchemaType, articleFormSchema } from '@/utils/validation/articleFormSchema';
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

  // Validate form data using Zod schema before conversion
  const validateFormData = (data: ArticleFormSchemaType): boolean => {
    try {
      console.log('Validating form data before submission:', data);
      const result = articleFormSchema.safeParse(data);
      
      if (!result.success) {
        console.error('Form validation failed:', result.error.format());
        toast({
          title: "Validation Error",
          description: "Please check all required fields are filled correctly.",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Form validation passed');
      return true;
    } catch (error) {
      console.error('Exception during validation:', error);
      toast({
        title: "Validation Error", 
        description: "There was an error validating your form data.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Convert form data to clean database format
  const convertToArticleFormData = (data: ArticleFormSchemaType): ArticleFormData => {
    console.log('Converting form data for article type:', data.articleType, data);
    
    // Start with base data that all article types need
    const baseData = {
      id: articleId,
      title: data.title?.trim() || '',
      content: data.content?.trim() || '',
      excerpt: data.excerpt?.trim() || '',
      imageUrl: data.imageUrl?.trim() || '',
      categoryId: data.categoryId?.trim() || '',
      slug: data.slug?.trim() || '',
      articleType: data.articleType,
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
    };

    // Add type-specific fields
    switch (data.articleType) {
      case 'video':
        return {
          ...baseData,
          videoUrl: data.videoUrl?.trim() || '',
        };
      
      case 'debate':
        return {
          ...baseData,
          content: data.content?.trim() || '',
          debateSettings: data.debateSettings ? {
            question: data.debateSettings.question?.trim() || '',
            yesPosition: data.debateSettings.yesPosition?.trim() || '',
            noPosition: data.debateSettings.noPosition?.trim() || '',
            votingEnabled: data.debateSettings.votingEnabled,
            voting_ends_at: data.debateSettings.voting_ends_at
          } : undefined,
        };
      
      case 'storyboard':
        return {
          ...baseData,
          storyboardEpisodes: (data.storyboardEpisodes || []).map(episode => ({
            title: episode.title?.trim() || '',
            description: episode.description?.trim() || '',
            videoUrl: episode.videoUrl?.trim() || '',
            thumbnailUrl: episode.thumbnailUrl?.trim() || '',
            duration: episode.duration?.trim() || '',
            number: episode.number,
            content: episode.content?.trim() || ''
          }))
        };
      
      default: // 'standard' article type
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
      const formData = form.getValues();
      const convertedData = convertToArticleFormData(formData);
      console.log('Saving draft with converted data:', convertedData);
      
      const result = await saveDraftOptimized(user.id, convertedData);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit function with proper validation
  const handleSubmit = async (data: ArticleFormSchemaType): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting article submission with form data:', data);

    try {
      // Validate using Zod schema before submission
      if (!validateFormData(data)) {
        return;
      }
      
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
        console.error('Submission failed with result:', result);
        throw new Error(result.error || 'Failed to submit article');
      }
    } catch (error) {
      console.error('Submit error:', error);
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
