
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
  autoSaveInterval = 120000, // Increased from 60s to 120s to reduce frequency
  submissionCompletedRef,
  isMountedRef
}: AutoSaveProps) {
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInProgressRef = useRef(false);
  const lastContentRef = useRef<string>(content);
  const lastFormStateRef = useRef<any>(form.getValues());
  const lastSavedDraftIdRef = useRef<string | undefined>(draftId);
  const saveCountRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Update draftId ref when prop changes
  useEffect(() => {
    lastSavedDraftIdRef.current = draftId;
  }, [draftId]);
  
  // Optimized auto save effect with improved submission handling, change detection, and debouncing
  useEffect(() => {
    // Skip auto-save if any of these conditions are true
    if (isSubmitting || isSaving || saveInProgressRef.current) {
      return;
    }
    
    // Critical check: Skip auto-save if submission has completed
    if (submissionCompletedRef?.current === true) {
      logger.debug(LogSource.EDITOR, 'Auto-save skipped: submission completed');
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
      
      // Clear any existing timeouts (debounce)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Implement debouncing to prevent rapid auto-saves
      // Only start the auto-save timer after 1.5s of inactivity
      debounceTimeoutRef.current = setTimeout(() => {
        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(() => {
          // Double-check submission state before executing save
          if (submissionCompletedRef?.current === true) {
            logger.debug(LogSource.EDITOR, 'Auto-save canceled: submission completed during timeout');
            return;
          }
          
          // Skip if unmounted or already saving
          if (!isMountedRef.current || saveInProgressRef.current) {
            return;
          }
          
          // Track save count for logging
          saveCountRef.current += 1;
          const currentSaveCount = saveCountRef.current;
          
          saveInProgressRef.current = true;
          setSaving(true);
          setSaveStatus('saving');
          
          const formData = {
            ...form.getValues(),
            content,
            id: lastSavedDraftIdRef.current // Use the most current draft ID
          };
          
          logger.info(LogSource.EDITOR, `Auto-save #${currentSaveCount} starting`, {
            hasDraftId: !!lastSavedDraftIdRef.current,
            contentLength: content.length
          });
          
          saveDraft(formData)
            .then(result => {
              if (!isMountedRef.current) return;
              
              if (result.success) {
                setSaveStatus('saved');
                setLastSaved(new Date());
                
                // Update draft ID if needed and ensure it's stored in ref for future saves
                if (result.articleId && setDraftId) {
                  lastSavedDraftIdRef.current = result.articleId;
                  setDraftId(result.articleId);
                  
                  logger.info(LogSource.EDITOR, `Auto-save #${currentSaveCount} completed`, {
                    articleId: result.articleId,
                    isNew: !lastSavedDraftIdRef.current || lastSavedDraftIdRef.current !== result.articleId
                  });
                }
              } else {
                setSaveStatus('error');
                logger.error(LogSource.EDITOR, `Auto-save #${currentSaveCount} failed`, { 
                  error: result.error 
                });
              }
            })
            .catch((error) => {
              if (isMountedRef.current) {
                setSaveStatus('error');
                logger.error(LogSource.EDITOR, `Auto-save #${currentSaveCount} exception`, { error });
              }
            })
            .finally(() => {
              if (isMountedRef.current) {
                setSaving(false);
                saveInProgressRef.current = false;
              }
            });
        }, autoSaveInterval);
      }, 1500); // 1.5 second debounce before starting auto-save timer
    }
    
    // Cleanup the timeouts when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
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
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
}
