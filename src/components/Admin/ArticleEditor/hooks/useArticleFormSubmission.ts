
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { ArticleFormSchemaType } from './useArticleFormLogic';
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

  // Convert form data to clean database format with proper field mapping
  const convertToArticleFormData = (data: ArticleFormSchemaType): ArticleFormData => {
    console.log('Converting form data for article type:', data.articleType, data);
    
    // Validate required fields before conversion
    const missingFields = [];
    if (!data.title?.trim()) missingFields.push('title');
    if (!data.content?.trim()) missingFields.push('content');
    if (!data.imageUrl?.trim()) missingFields.push('imageUrl');
    if (!data.categoryId?.trim()) missingFields.push('categoryId');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Start with base data that all article types need
    const baseData = {
      id: articleId,
      title: data.title.trim(),
      content: data.content.trim(),
      excerpt: data.excerpt?.trim() || '',
      imageUrl: data.imageUrl.trim(), // This will be mapped to cover_image in the service
      categoryId: data.categoryId.trim(), // This will be mapped to category_id in the service
      slug: data.slug?.trim() || '',
      articleType: data.articleType,
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
    };

    console.log('Base data after conversion:', baseData);

    // Only add type-specific fields for the appropriate article type
    switch (data.articleType) {
      case 'video':
        return {
          ...baseData,
          videoUrl: data.videoUrl?.trim() || '',
        };
      
      case 'debate':
        return {
          ...baseData,
          content: data.content?.trim() || '', // Debate articles can have optional content
          debateSettings: data.debateSettings ? {
            question: data.debateSettings.question.trim(),
            yesPosition: data.debateSettings.yesPosition.trim(),
            noPosition: data.debateSettings.noPosition.trim(),
            votingEnabled: data.debateSettings.votingEnabled,
            voting_ends_at: data.debateSettings.voting_ends_at
          } : undefined,
        };
      
      case 'storyboard':
        return {
          ...baseData,
          storyboardEpisodes: (data.storyboardEpisodes || []).map(episode => ({
            title: episode.title.trim(),
            description: episode.description.trim(),
            videoUrl: episode.videoUrl.trim(),
            thumbnailUrl: episode.thumbnailUrl.trim(),
            duration: episode.duration.trim(),
            number: episode.number,
            content: episode.content.trim()
          }))
        };
      
      default: // 'standard' article type (headliners)
        // Standard articles only get base fields, no additional type-specific fields
        console.log('Converting standard article with base data only');
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

  // Submit function with better error handling
  const handleSubmit = async (data: ArticleFormSchemaType): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting article submission with raw form data:', data);

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
        console.error('Submission failed with result:', result);
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
