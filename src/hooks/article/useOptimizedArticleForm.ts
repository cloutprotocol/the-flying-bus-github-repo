import { useEffect, useState, useCallback, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';
import { useContentManagement } from './useContentManagement';
import { useArticleDebug } from '../useArticleDebug';
import { useToast } from '../use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { useNavigate } from 'react-router-dom';

// Auto-save configuration - increased interval and added debounce
const AUTO_SAVE_INTERVAL = 120000; // 2 minutes (increased from 60000)
const AUTO_SAVE_DEBOUNCE = 5000;   // 5 seconds debounce (increased from 2000)
const MAX_TOAST_NOTIFICATIONS = 2; // Limit toast notifications for auto-saves

export const useOptimizedArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const navigate = useNavigate();
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
  const autoSaveCountRef = useRef<number>(0); // Track number of auto-saves for toast limiting

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
      
      // Only log the first few auto-saves to prevent log flooding
      if (autoSaveCountRef.current < 5) {
        addDebugStep('Auto-saving draft (debounced)', {
          draftId,
          articleType,
          isUpdate: !!draftId,
          autoSaveCount: autoSaveCountRef.current
        });
      }
      
      const formData = latestFormDataRef.current;
      
      // Limit logging of repeated auto-saves
      if (autoSaveCountRef.current < 3) {
        logger.info(LogSource.EDITOR, 'Debounced save called with content', {
          contentLength: formData.content?.length || 0,
          draftId,
          autoSaveCount: autoSaveCountRef.current
        });
      }
      
      const result = await articleSubmissionService.saveDraft(
        draftId || '', 
        formData
      );
      
      if (!result.success) {
        updateLastStep('error', { error: result.error });
        setSaveStatus('error');
        logger.error(LogSource.EDITOR, 'Debounced save failed', { 
          error: result.error 
        });
        
        // Only show toast for first few errors to prevent flooding
        if (autoSaveCountRef.current < MAX_TOAST_NOTIFICATIONS) {
          toast({
            title: "Auto-save failed",
            description: "Changes couldn't be saved automatically. Try saving manually.",
            variant: "destructive"
          });
        }
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
      
      // Only update the last step if we're not overloading debug steps
      if (autoSaveCountRef.current < 5) {
        updateLastStep('success', { 
          articleId: result.articleId, 
          source: 'auto-save' 
        });
      }
      
      // Only show toast notification for first couple of auto-saves
      if (autoSaveCountRef.current < MAX_TOAST_NOTIFICATIONS) {
        toast({
          title: "Draft auto-saved",
          description: "Your changes have been saved automatically",
        });
      }
      
      // Increment auto-save counter
      autoSaveCountRef.current++;
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in auto-save', { error });
      setSaveStatus('error');
      
      // Only show error toast for first few errors
      if (autoSaveCountRef.current < MAX_TOAST_NOTIFICATIONS) {
        toast({
          title: "Auto-save error",
          description: "An unexpected error occurred during auto-save",
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [draftId, articleType, isSubmitting, addDebugStep, updateLastStep, toast]);

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
      // Debounce frequent changes - only start debounce timer if we're not submitting or saving
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
  
  // Manual save draft function - with protection against duplicate calls
  const savingRef = useRef(false); // Prevent duplicate calls
  const handleSaveDraft = async (): Promise<void> => {
    // Prevent duplicate save calls
    if (savingRef.current) {
      console.log("Save already in progress, skipping duplicate call");
      return;
    }
    
    try {
      savingRef.current = true;
      setIsSaving(true);
      setSaveStatus('saving');
      
      const formData = {
        ...form.getValues(),
        content
      };
      
      logger.info(LogSource.EDITOR, 'Manual draft save called', {
        contentLength: content?.length || 0,
        draftId
      });
      
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
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in manual draft save', { error });
      updateLastStep('error', { error });
      setSaveStatus('error');
      
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving your draft.",
        variant: "destructive"
      });
      
    } finally {
      setIsSaving(false);
      savingRef.current = false; // Reset the saving flag
    }
  };
  
  // Submit article for review - with protection against duplicate submissions
  const submittingRef = useRef(false); // Prevent duplicate submissions
  const handleSubmit = async (data: any) => {
    // Prevent duplicate submissions
    if (submittingRef.current || isSubmitting) {
      console.log("Submission already in progress, skipping duplicate call");
      return;
    }
    
    console.log("Submit button clicked", { data, content });
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      addDebugStep('Article submission initiated', {
        isDraft: false,
        articleType,
        isNewArticle,
        formData: {
          title: data.title,
          categoryId: data.categoryId, 
          contentLength: content?.length || 0
        }
      });
      
      logger.info(LogSource.EDITOR, 'Article submission started', {
        draftId,
        articleType,
        contentLength: content?.length || 0
      });
      
      // Show submission in progress toast
      const submittingToast = toast({
        title: "Submitting article",
        description: "Your article is being submitted for review...",
      });
      
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
          articleType: formData.articleType,
          contentLength: content?.length || 0
        }
      });
      
      // Use the unified service to save the draft
      setIsSaving(true);
      setSaveStatus('saving');
      
      console.log("Saving draft before submission:", {
        contentType: typeof content,
        contentLength: content?.length || 0,
        title: formData.title,
        draftId
      });
      
      // Dismiss the submitting toast to prevent toast flooding
      submittingToast.dismiss();
      
      const saveResult = await articleSubmissionService.saveDraft(
        draftId || articleId || '',
        formData
      );
      
      setIsSaving(false);
      
      if (!saveResult.success) {
        console.error("Failed to save draft:", saveResult.error);
        updateLastStep('error', { error: 'Failed to save draft' });
        logger.error(LogSource.EDITOR, 'Failed to save draft during submission', {
          saveResult,
          error: saveResult.error
        });
        
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      updateLastStep('success', { articleId: saveResult.articleId });
      setSaveStatus('saved');
      
      if (!saveResult.articleId) {
        console.error("No article ID returned from draft save");
        addDebugStep('Error: No article ID returned', null, 'error');
        logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }

      // Now submit for review using the unified service
      addDebugStep('Submitting article for review', { 
        articleId: saveResult.articleId
      });
      
      console.log("Calling submitForReview with articleId:", saveResult.articleId);
      logger.info(LogSource.EDITOR, 'Calling submitForReview', {
        articleId: saveResult.articleId
      });
      
      const submissionResult = await articleSubmissionService.submitForReview(saveResult.articleId);
      
      if (!submissionResult.success) {
        console.error("Submission failed:", submissionResult.error);
        const errorMessage = submissionResult.error?.message || "There was a problem submitting your article for review.";
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        updateLastStep('error', { error: submissionResult.error });
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      console.log("Article submitted successfully!");
      
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
      
      // Navigate to articles list after successful submission
      setTimeout(() => {
        console.log("Navigating to /admin/articles after submission");
        navigate('/admin/articles');
      }, 1500);
      
      return saveResult.articleId;
    } catch (error) {
      console.error("Exception in article submission:", error);
      addDebugStep('Exception in article submission', { error }, 'error');
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem with your submission.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false; // Reset the submitting flag
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
