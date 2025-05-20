
import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface AutoSaveProps {
  form: any;
  content: string;
  draftId?: string;
  articleType: string;
  isSubmitting: boolean;
  isSaving: boolean;
  setSaving: (isSaving: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  setLastSaved: (date: Date | null) => void;
  saveDraft: (formData: any) => Promise<{ success: boolean; articleId?: string; error?: any }>;
  setDraftId?: (id: string) => void;
  autoSaveInterval?: number;
  submissionCompletedRef: React.MutableRefObject<boolean>;
  isMountedRef: React.MutableRefObject<boolean>;
}

export function useAutoSaveHandler({
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
  setDraftId,
  autoSaveInterval = 60000, // Default to 60 seconds
  submissionCompletedRef,
  isMountedRef
}: AutoSaveProps) {
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInProgressRef = useRef(false);
  const lastContentRef = useRef<string>(content);
  const lastFormStateRef = useRef<any>(form.getValues());
  
  // Optimized auto save effect with improved submission handling and change detection
  useEffect(() => {
    // Skip auto-save if any of these conditions are true
    if (isSubmitting || isSaving || saveInProgressRef.current) {
      return;
    }
    
    // Critical check: Skip auto-save if submission has completed
    if (submissionCompletedRef?.current === true) {
      return;
    }
    
    const formValues = form.getValues();
    const isDirty = form.formState.isDirty;
    
    // Detect meaningful changes to avoid unnecessary saves
    const contentChanged = content !== lastContentRef.current;
    const formChanged = JSON.stringify(formValues) !== JSON.stringify(lastFormStateRef.current);
    
    if (isDirty || contentChanged || formChanged) {
      // Update refs for change detection
      lastContentRef.current = content;
      lastFormStateRef.current = formValues;
      
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Double-check submission state before executing save
        if (submissionCompletedRef?.current === true) {
          return;
        }
        
        // Skip if unmounted or already saving
        if (!isMountedRef.current || saveInProgressRef.current) {
          return;
        }
        
        saveInProgressRef.current = true;
        setSaving(true);
        setSaveStatus('saving');
        
        const formData = {
          ...form.getValues(),
          content
        };
        
        saveDraft(formData)
          .then(result => {
            if (!isMountedRef.current) return;
            
            if (result.success) {
              setSaveStatus('saved');
              setLastSaved(new Date());
              
              // Update draft ID if needed
              if (result.articleId && setDraftId && !draftId) {
                setDraftId(result.articleId);
              }
            } else {
              setSaveStatus('error');
            }
          })
          .catch(() => {
            if (isMountedRef.current) {
              setSaveStatus('error');
            }
          })
          .finally(() => {
            if (isMountedRef.current) {
              setSaving(false);
              saveInProgressRef.current = false;
            }
          });
      }, autoSaveInterval);
    }
    
    // Cleanup the timeout when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    form,
    content,
    draftId,
    isSubmitting,
    isSaving,
    setSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft,
    setDraftId,
    autoSaveInterval,
    form.formState.isDirty,
    submissionCompletedRef,
    isMountedRef
  ]);
  
  // Cancel auto-save timeouts when unmounting
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
}
