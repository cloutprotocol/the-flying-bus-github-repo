
import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDraftManagement } from './article/useDraftManagement';
import { useArticleSubmission } from './article/useArticleSubmission';
import { useContentManagement } from './article/useContentManagement';
import { useArticleDebug } from './useArticleDebug';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const AUTO_SAVE_INTERVAL = 60000;

export const useArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const { toast } = useToast();
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  const { draftId, saveStatus, lastSaved, saveDraftToServer } = useDraftManagement(articleId, articleType);
  const { isSubmitting, setIsSubmitting, handleArticleSubmission } = useArticleSubmission();
  const { addDebugStep, updateLastStep } = useArticleDebug();

  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    try {
      setIsSubmitting(true);
      addDebugStep('Article submission initiated', {
        isDraft,
        articleType,
        isNewArticle: isNewArticle
      });
      
      // Validate required fields
      if (!data.title) {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing title' });
        setIsSubmitting(false);
        return;
      }
      
      if (!data.categoryId) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing category' });
        setIsSubmitting(false);
        return;
      }
      
      if (!content || content.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article content is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing content' });
        setIsSubmitting(false);
        return;
      }
      
      const formData = {
        ...data,
        content: content,
        status: isDraft ? 'draft' : 'pending'
      };
      
      addDebugStep('Saving draft before submission', { 
        articleId, 
        draftId, 
        formData: {
          title: formData.title,
          categoryId: formData.categoryId,
          articleType: formData.articleType,
          status: formData.status
        }
      });
      
      const saveResult = await saveDraftToServer(formData, true);
      
      if (!saveResult.success) {
        updateLastStep('error', { error: saveResult.error });
        logger.error(LogSource.EDITOR, 'Failed to save draft during submission', {
          saveResult,
          isDraft
        });
        
        toast({
          title: "Error",
          description: saveResult.error?.message || "There was a problem saving your article.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      updateLastStep('success', { articleId: saveResult.articleId });
      
      if (!saveResult.articleId) {
        addDebugStep('Error: No article ID returned', null, 'error');
        logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      addDebugStep('Changing article status', { 
        articleId: saveResult.articleId,
        targetStatus: isDraft ? 'draft' : 'pending'
      });
      
      const submissionResult = await handleArticleSubmission(saveResult.articleId, isDraft);
      
      if (submissionResult) {
        updateLastStep('success', { status: isDraft ? 'Draft saved' : 'Submitted for review' });
        addDebugStep('Article submission completed', { 
          isDraft,
          articleId: saveResult.articleId
        }, 'success');
      } else {
        updateLastStep('error', { error: 'Submission failed' });
      }
      
    } catch (error) {
      addDebugStep('Exception in article submission', { error }, 'error');
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem with your submission.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const isDirty = form.formState.isDirty;
    const contentChanged = content !== '';
    
    if ((isDirty || contentChanged) && !isSubmitting) {
      const autoSaveTimer = setTimeout(() => {
        if (isAutoSaving) return;
        
        setIsAutoSaving(true);
        const formData = form.getValues();
        
        saveDraftToServer({
          ...formData,
          content
        }, true).finally(() => {
          setIsAutoSaving(false);
        });
      }, AUTO_SAVE_INTERVAL);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [form, content, saveDraftToServer, form.formState.isDirty, isSubmitting, isAutoSaving]);

  const handleSaveDraft = async () => {
    const formData = {
      ...form.getValues(),
      content
    };
    
    await handleSubmit(formData, true);
  };

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    handleSubmit,
    handleSaveDraft
  };
};
