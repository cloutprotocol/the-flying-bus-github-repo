import { useEffect, useRef, useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';

// Auto-save configuration
const AUTO_SAVE_INTERVAL = 120000; // 2 minutes
const AUTO_SAVE_DEBOUNCE = 5000;   // 5 seconds debounce
const MAX_TOAST_NOTIFICATIONS = 2; // Limit toast notifications for auto-saves

export interface AutoSaveOptions {
  form: UseFormReturn<any>;
  content: string;
  draftId?: string;
  articleType: string;
  isSubmitting: boolean;
  isSaving: boolean;
  setSaving: (isSaving: boolean) => void;
  setSaveStatus: (status: DraftSaveStatus) => void;
  setLastSaved: (date: Date | null) => void;
  saveDraft: (formData: any) => Promise<{ success: boolean; articleId?: string; error?: any }>;
  setDraftId?: (id: string) => void;
}

export function useArticleAutoSave({
  form,
  content,
  draftId,
  articleType,
  isSubmitting,
  isSaving,
  setSaving,
  setSaveStatus,
  setLastSaved,
  saveDraft,
  setDraftId
}: AutoSaveOptions) {
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  // Use refs for debounce timer and latest form data
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestFormDataRef = useRef<any>(null);
  const isDirtyRef = useRef<boolean>(false);
  const autoSaveCountRef = useRef<number>(0); // Track number of auto-saves for toast limiting
  const isMountedRef = useRef(true);
  
  // Keep track of if component is mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      setSaving(true);
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
      
      const result = await saveDraft(formData);
      
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
      if (!draftId && result.articleId && setDraftId) {
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
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [draftId, articleType, isSubmitting, addDebugStep, updateLastStep, toast, saveDraft, setSaving, setSaveStatus, setLastSaved, setDraftId]);

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

  return {
    autoSaveActive: !!autoSaveTimerRef.current || !!debounceTimerRef.current
  };
}
