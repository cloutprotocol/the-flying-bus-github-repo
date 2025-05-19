
import { useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useArticleDebug } from '@/hooks/useArticleDebug';

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
  submissionCompletedRef?: React.MutableRefObject<boolean>;
}

export const useArticleAutoSave = ({
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
  submissionCompletedRef
}: AutoSaveProps) => {
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const { addDebugStep } = useArticleDebug();
  
  // For monitoring if a debounced save is in progress
  const saveInProgressRef = useRef(false);
  
  // Cancel any pending auto-save timeouts when unmounting
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  
  // Auto save effect
  useEffect(() => {
    // Don't auto-save if submission is in progress
    if (isSubmitting || isSaving || autoSaving) {
      return;
    }
    
    // IMPORTANT: Skip auto-save if submission has completed 
    // This prevents auto-saving from overriding submitted status
    if (submissionCompletedRef?.current) {
      logger.info(LogSource.EDITOR, 'Skipping auto-save because submission has completed');
      return;
    }
    
    const isDirty = form.formState.isDirty;
    const contentChanged = content !== '';
    
    if ((isDirty || contentChanged)) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (saveInProgressRef.current) {
          logger.info(LogSource.EDITOR, 'Auto-save already in progress, skipping');
          return;
        }
        
        // Check again if submission has completed
        if (submissionCompletedRef?.current) {
          logger.info(LogSource.EDITOR, 'Skipping scheduled auto-save because submission has completed');
          return;
        }
        
        saveInProgressRef.current = true;
        setAutoSaving(true);
        setSaving(true);
        setSaveStatus('saving');
        
        logger.info(LogSource.EDITOR, 'Auto-saving draft', {
          draftId,
          hasContent: !!content,
          contentLength: content?.length || 0
        });
        
        const formData = form.getValues();
        
        saveDraft({
          ...formData,
          content
        }).then(result => {
          if (result.success) {
            setSaveStatus('saved');
            setLastSaved(new Date());
            
            // Update draft ID if this is a new article
            if (result.articleId && setDraftId && !draftId) {
              setDraftId(result.articleId);
            }
            
            logger.info(LogSource.EDITOR, 'Auto-save successful', {
              draftId: result.articleId || draftId,
              timestamp: new Date().toISOString()
            });
          } else {
            setSaveStatus('error');
            
            logger.error(LogSource.EDITOR, 'Auto-save failed', {
              draftId,
              error: result.error
            });
          }
        }).catch(error => {
          setSaveStatus('error');
          
          logger.error(LogSource.EDITOR, 'Debounced save failed', {
            error
          });
        }).finally(() => {
          if (isMountedRef.current) {
            setSaving(false);
            setAutoSaving(false);
          }
          saveInProgressRef.current = false;
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
    autoSaving, 
    setSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft,
    setDraftId,
    autoSaveInterval,
    form.formState.isDirty,
    submissionCompletedRef
  ]);
};
