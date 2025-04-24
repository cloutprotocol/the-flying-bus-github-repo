
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

interface SubmissionOptions {
  content: string;
  draftId?: string;
  onDraftIdChange: (id: string) => void;
}

export const useSubmissionState = ({ content, draftId, onDraftIdChange }: SubmissionOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();

  const handleSubmit = async (data: any): Promise<string | undefined> => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      addDebugStep('Article submission initiated', {
        isDraft: false,
        isUpdate: !!draftId
      });

      if (!validateSubmission(data, content)) {
        setIsSubmitting(false);
        return;
      }

      const formData = {
        ...data,
        content,
        status: 'draft'
      };

      const saveResult = await articleSubmissionService.saveDraft(
        draftId || '',
        formData
      );

      if (!handleSaveResult(saveResult)) {
        setIsSubmitting(false);
        return;
      }

      const submissionResult = await articleSubmissionService.submitForReview(saveResult.articleId);
      
      if (!submissionResult.success) {
        handleSubmissionError(submissionResult.error);
        setIsSubmitting(false);
        return;
      }

      if (!draftId && saveResult.articleId) {
        onDraftIdChange(saveResult.articleId);
      }

      toast({
        title: "Success",
        description: "Your article has been submitted for review.",
      });

      updateLastStep('success', { status: 'Submitted for review' });
      addDebugStep('Article submission completed', { 
        articleId: saveResult.articleId
      }, 'success');
      
      setIsSubmitting(false);
      return saveResult.articleId;
    } catch (error) {
      handleSubmissionError(error);
      setIsSubmitting(false);
      return;
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleSubmit
  };
};

// Helper functions
const validateSubmission = (data: any, content: string) => {
  const { toast } = useToast();

  if (!data.title) {
    toast({
      title: "Validation Error",
      description: "Article title is required",
      variant: "destructive"
    });
    return false;
  }

  if (!data.categoryId) {
    toast({
      title: "Validation Error",
      description: "Please select a category",
      variant: "destructive"
    });
    return false;
  }

  if (!content || content.trim() === '') {
    toast({
      title: "Validation Error",
      description: "Article content is required",
      variant: "destructive"
    });
    return false;
  }

  return true;
};

const handleSaveResult = (saveResult: { success: boolean; articleId?: string; error?: any }) => {
  const { toast } = useToast();
  const { updateLastStep } = useArticleDebug();

  if (!saveResult.success) {
    updateLastStep('error', { error: 'Failed to save draft' });
    logger.error(LogSource.EDITOR, 'Failed to save draft during submission', {
      saveResult
    });
    
    toast({
      title: "Error",
      description: "There was a problem saving your article.",
      variant: "destructive"
    });
    return false;
  }

  if (!saveResult.articleId) {
    logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
    toast({
      title: "Error",
      description: "Could not determine article ID.",
      variant: "destructive"
    });
    return false;
  }

  return true;
};

const handleSubmissionError = (error: any) => {
  const { toast } = useToast();
  const { addDebugStep } = useArticleDebug();

  addDebugStep('Exception in article submission', { error }, 'error');
  logger.error(LogSource.EDITOR, "Exception in article submission", error);
  
  toast({
    title: "Error",
    description: "There was a problem with your submission.",
    variant: "destructive"
  });
};
