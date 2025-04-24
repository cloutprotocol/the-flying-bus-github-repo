import { useEffect, useState, useCallback, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';
import { useContentManagement } from './useContentManagement';
import { useArticleDebug } from '../useArticleDebug';
import { useToast } from '../use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';

// Auto-save configuration
const AUTO_SAVE_INTERVAL = 60000; // 1 minute
const AUTO_SAVE_DEBOUNCE = 2000;  // 2 seconds debounce

export const useOptimizedArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  // Use refs for debounce timer and latest form data
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestFormDataRef = useRef<any>(null);
  const isDirtyRef = useRef<boolean>(false);

  // Keep track of latest form data for debounced saves
  useEffect(() => {
    latestFormDataRef.current = {
      ...form.getValues(),
      content
    };
    isDirtyRef.current = form.formState.isDirty || content !== '';
  }, [form, content]);

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    if (!isDirtyRef.current || isSubmitting) return;
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      addDebugStep('Auto-saving draft (debounced)', {
        draftId,
        articleType,
        isUpdate: !!draftId
      });
      
      const formData = latestFormDataRef.current;
      
      const result = await articleSubmissionService.saveDraft(
        draftId || '', 
        formData
      );
      
      if (!result.success) {
        updateLastStep('error', { error: result.error });
        setSaveStatus('error');
        return;
      }
      
      // Update draft ID if this was first save
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
        logger.info(LogSource.EDITOR, 'Setting new draft ID from auto-save', { 
          newArticleId: result.articleId 
        });
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      updateLastStep('success', { 
        articleId: result.articleId, 
        source: 'auto-save' 
      });
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in auto-save', { error });
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [draftId, articleType, isSubmitting, addDebugStep, updateLastStep]);

  // Set up auto-save with debouncing
  useEffect(() => {
    const isDirty = form.formState.isDirty;
    const contentChanged = content !== '';
    
    // Clear any existing timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    // Set up debounced auto-save
    if ((isDirty || contentChanged) && !isSubmitting && !isSaving) {
      // Debounce frequent changes
      debounceTimerRef.current = setTimeout(() => {
        // Only auto-save after content has been stable for a while
        autoSaveTimerRef.current = setTimeout(() => {
          debouncedSave();
        }, AUTO_SAVE_INTERVAL);
      }, AUTO_SAVE_DEBOUNCE);
    }
    
    return () => {
      // Clean up timers on unmount or dependency change
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form.formState.isDirty, content, isSubmitting, isSaving, debouncedSave]);
  
  // Manual save draft function
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      const formData = {
        ...form.getValues(),
        content
      };
      
      addDebugStep('Manually saving draft', {
        draftId,
        articleType,
        isUpdate: !!draftId
      });
      
      const result = await articleSubmissionService.saveDraft(
        draftId || '',
        formData
      );
      
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to save your draft. Please try again.",
          variant: "destructive"
        });
        updateLastStep('error', { error: result.error });
        setSaveStatus('error');
        return;
      }
      
      // Update draft ID if this was first save
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
      }
      
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully.",
      });
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      updateLastStep('success', { 
        articleId: result.articleId,
        source: 'manual-save'
      });
      
      return result.articleId;
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in manual draft save', { error });
      updateLastStep('error', { error });
      setSaveStatus('error');
      
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving your draft.",
        variant: "destructive"
      });
      
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Submit article for review
  const handleSubmit = async (data: any) => {
    try {
      // Prevent double submission
      if (isSubmitting) return;
      
      setIsSubmitting(true);
      addDebugStep('Article submission initiated', {
        isDraft: false,
        articleType,
        isNewArticle
      });
      
      // Validate required fields
      if (!data.title) {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing title' });
        return;
      }
      
      if (!data.categoryId) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing category' });
        return;
      }
      
      if (!content || content.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article content is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing content' });
        return;
      }
      
      // First save as draft to ensure all content is saved
      const formData = {
        ...data,
        content,
        status: 'draft' // Always save as draft first
      };
      
      addDebugStep('Saving draft before submission', { 
        articleId, 
        draftId, 
        formData: {
          title: formData.title,
          categoryId: formData.categoryId,
          articleType: formData.articleType
        }
      });
      
      // Use the unified service to save the draft
      setIsSaving(true);
      setSaveStatus('saving');
      
      const saveResult = await articleSubmissionService.saveDraft(
        draftId || articleId || '',
        formData
      );
      
      setIsSaving(false);
      
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
        return;
      }
      
      updateLastStep('success', { articleId: saveResult.articleId });
      setSaveStatus('saved');
      
      if (!saveResult.articleId) {
        addDebugStep('Error: No article ID returned', null, 'error');
        logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        return;
      }

      // Now submit for review using the unified service
      addDebugStep('Submitting article for review', { 
        articleId: saveResult.articleId
      });
      
      const submissionResult = await articleSubmissionService.submitForReview(saveResult.articleId);
      
      if (!submissionResult.success) {
        const errorMessage = submissionResult.error?.message || "There was a problem submitting your article for review.";
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        updateLastStep('error', { error: submissionResult.error });
        return;
      }
      
      // Update draft ID if this was first submission
      if (!draftId && !articleId && saveResult.articleId) {
        setDraftId(saveResult.articleId);
      }
      
      toast({
        title: "Success",
        description: "Your article has been submitted for review.",
      });
      
      updateLastStep('success', { status: 'Submitted for review' });
      addDebugStep('Article submission completed', { 
        articleId: saveResult.articleId
      }, 'success');
      
      return saveResult.articleId;
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

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit,
    handleSaveDraft
  };
};
