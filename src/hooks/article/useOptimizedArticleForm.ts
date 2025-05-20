
import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Import refactored hooks
import { useArticleFormState } from './form/useArticleFormState';
import { useDraftSaveService } from './form/useDraftSaveService';
import { useManualSaveHandler } from './form/useManualSaveHandler';
import { useAutoSaveHandler } from './form/useAutoSaveHandler';
import { useArticleSubmission } from './form/useArticleSubmission';

export const useOptimizedArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  // Initialize form state management
  const {
    isSubmitting,
    setIsSubmitting,
    isSaving,
    setIsSaving,
    saveStatus,
    setSaveStatus,
    lastSaved,
    setLastSaved,
    draftId,
    setDraftId,
    content,
    setContent,
    submissionCompletedRef,
    isMountedRef
  } = useArticleFormState(form, articleId, isNewArticle);
  
  // Setup draft saving service
  const { saveDraftOptimized } = useDraftSaveService();
  
  // Setup manual save functionality
  const { handleSaveDraft } = useManualSaveHandler({
    draftId,
    articleType,
    setSaving: setIsSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft: saveDraftOptimized,
    setDraftId,
    isMountedRef
  });
  
  // Setup auto-save functionality
  useAutoSaveHandler({
    form,
    content,
    draftId,
    articleType,
    isSubmitting,
    isSaving,
    setSaving: setIsSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft: saveDraftOptimized,
    setDraftId,
    submissionCompletedRef,
    isMountedRef
  });
  
  // Setup article submission
  const { submitArticle } = useArticleSubmission();
  
  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    
    // Log component initialization for performance tracking
    logger.info(LogSource.EDITOR, 'ArticleForm initialized', {
      articleId,
      isNewArticle,
      articleType
    });
    
    return () => {
      isMountedRef.current = false;
    };
  }, [articleId, isNewArticle, articleType, isMountedRef]);
  
  // Handle manual draft save
  const saveManualDraft = async (): Promise<void> => {
    if (isSaving || isSubmitting) {
      return;
    }
    
    const formData = {
      ...form.getValues(),
      content,
      id: draftId
    };
    
    await handleSaveDraft(formData);
  };
  
  // Handle article submission with combined save+submit
  const handleSubmit = async (data: any) => {
    if (isSubmitting) {
      return null;
    }
    
    setIsSubmitting(true);
    
    try {
      const completeData = {
        ...data,
        content,
        id: draftId,
        articleType
      };
      
      const success = await submitArticle(completeData);
      
      if (!success) {
        setIsSubmitting(false);
        return null;
      }
      
      return draftId;
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in form submission', { error });
      setIsSubmitting(false);
      return null;
    }
  };

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit,
    handleSaveDraft: saveManualDraft
  };
};
