
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { StandardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { UnifiedSubmissionService } from '@/services/articles/unifiedSubmissionService';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { generateSubmissionSlug } from '@/utils/article/slugGenerator';

interface UseStandardArticleSubmissionProps {
  form: UseFormReturn<StandardArticleFormData>;
  articleId?: string;
}

export const useStandardArticleSubmission = ({ form, articleId }: UseStandardArticleSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);

  const convertToArticleFormData = (data: StandardArticleFormData): ArticleFormData => {
    console.log('Converting form data:', data);
    
    // Convert form status to ArticleFormData status
    const convertedStatus = data.status === 'pending_review' ? 'pending' : data.status;
    
    // Always generate a fresh slug for submission to avoid duplicates
    const submissionSlug = generateSubmissionSlug(data.title || '');
    
    return {
      id: articleId,
      title: data.title || '',
      content: data.content || '',
      excerpt: data.excerpt || '',
      imageUrl: data.imageUrl || '',
      categoryId: data.categoryId || '',
      slug: submissionSlug, // Use fresh generated slug
      articleType: 'standard',
      status: convertedStatus as any,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight || false,
      allowVoting: data.allowVoting || false
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
      
      logger.info(LogSource.ARTICLE, 'Saving standard article draft', {
        articleType: convertedData.articleType,
        title: convertedData.title,
        slug: convertedData.slug
      });
      
      console.log('Calling UnifiedSubmissionService.saveDraft with slug:', convertedData.slug);
      
      const result = await UnifiedSubmissionService.saveDraft(convertedData, user.id);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
        
        // Update form with the returned article ID if this was a new article
        if (result.articleId && !articleId) {
          form.setValue('id' as any, result.articleId);
        }
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Save draft error', error);
      console.error('Draft save error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (data: StandardArticleFormData): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    console.log('handleSubmit called with data:', data);
    logger.info(LogSource.ARTICLE, 'Starting standard article submission');

    try {
      const convertedData = convertToArticleFormData(data);
      
      console.log('Calling UnifiedSubmissionService.submitForReview with fresh slug:', convertedData.slug);
      
      const result = await UnifiedSubmissionService.submitForReview(convertedData, user.id);
      
      console.log('Submission result:', result);
      
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
      logger.error(LogSource.ARTICLE, 'Submit error', error);
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });
      throw error; // Re-throw so the form can handle it
    }
  };

  return {
    isSaving,
    handleSaveDraft,
    handleSubmit
  };
};
