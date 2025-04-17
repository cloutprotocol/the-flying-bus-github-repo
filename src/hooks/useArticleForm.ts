
import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDraftManagement } from './article/useDraftManagement';
import { useArticleSubmission } from './article/useArticleSubmission';
import { useContentManagement } from './article/useContentManagement';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const AUTO_SAVE_INTERVAL = 60000; // Auto-save every minute

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

  // Handle form submission
  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    try {
      setIsSubmitting(true);
      
      const formData = {
        ...data,
        content: content,
        status: isDraft ? 'draft' : 'pending'
      };
      
      logger.info(LogSource.EDITOR, 'Submitting article form', {
        isDraft,
        articleType,
        isNewArticle,
        hasArticleId: !!articleId,
        hasDraftId: !!draftId,
        formData: Object.keys(formData)
      });
      
      // First save the draft to ensure we have an article ID
      const saveResult = await saveDraftToServer(formData, true);
      
      if (!saveResult.success) {
        logger.error(LogSource.EDITOR, 'Failed to save draft during submission', {
          saveResult,
          isDraft
        });
        
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        return;
      }
      
      if (!saveResult.articleId) {
        logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        return;
      }

      logger.info(LogSource.EDITOR, 'Draft saved during submission, proceeding to submission', {
        articleId: saveResult.articleId,
        isDraft
      });

      await handleArticleSubmission(saveResult.articleId, isDraft);
      
    } catch (error) {
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

  // Setup auto-save interval
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
