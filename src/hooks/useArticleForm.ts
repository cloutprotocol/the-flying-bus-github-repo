
import { useEffect } from 'react';
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
        isNewArticle
      });
      
      // First save the draft to ensure we have an article ID
      const saveResult = await saveDraftToServer(formData, true);
      
      if (!saveResult.success) {
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        return;
      }

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
    
    if (isDirty || contentChanged) {
      const autoSaveTimer = setTimeout(() => {
        const formData = form.getValues();
        saveDraftToServer(formData, true);
      }, AUTO_SAVE_INTERVAL);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [form, content, saveDraftToServer, form.formState.isDirty]);

  const handleSaveDraft = () => {
    const formData = form.getValues();
    handleSubmit(formData, true);
  };

  return {
    content,
    setContent,
    saveStatus,
    lastSaved,
    isSubmitting,
    handleSubmit,
    handleSaveDraft
  };
};
