
import { useState, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';
import { useContentManagement } from './useContentManagement';
import { useArticleDebug } from '../useArticleDebug';
import { useArticleAutoSave } from './autoSave/useArticleAutoSave';
import { useManualSave } from './manual/useManualSave';
import { useArticleSubmitAction } from './submission/useArticleSubmitAction';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';

export const useOptimizedArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  
  // Content management
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Wrapper for saving drafts
  const saveDraft = async (formData: any) => {
    return await articleSubmissionService.saveDraft(
      draftId || '',
      formData
    );
  };
  
  // Wrapper for submitting for review
  const submitForReview = async (articleId: string) => {
    return await articleSubmissionService.submitForReview(articleId);
  };

  // Auto-save functionality
  useArticleAutoSave({
    form,
    content,
    draftId,
    articleType,
    isSubmitting,
    isSaving,
    setSaving: setIsSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft,
    setDraftId
  });

  // Manual save functionality
  const { handleSaveDraft } = useManualSave({
    draftId,
    articleType,
    setSaving: setIsSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft,
    setDraftId
  });

  // Article submission functionality
  const { handleSubmit } = useArticleSubmitAction({
    draftId,
    articleId,
    articleType,
    isNewArticle,
    isSubmitting,
    setSubmitting: setIsSubmitting,
    isSaving,
    setSaving: setIsSaving,
    setSaveStatus,
    saveDraft,
    submitForReview,
    setDraftId
  });

  // Handle manual draft save - convert return type from Promise<boolean> to Promise<void>
  const saveManualDraft = async (): Promise<void> => {
    const formData = {
      ...form.getValues(),
      content
    };
    
    // Call the original function but ignore the return value to match the expected Promise<void> type
    await handleSaveDraft(formData);
    return;
  };

  // Handle article submission
  const submitArticle = async (data: any) => {
    return handleSubmit({
      ...data,
      content,
      isDirty: form.formState.isDirty
    });
  };

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit: submitArticle,
    handleSaveDraft: saveManualDraft
  };
};
