
import { useCallback, useEffect, useRef } from 'react';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

const AUTO_SAVE_INTERVAL = 60000; // 1 minute
const AUTO_SAVE_DEBOUNCE = 2000;  // 2 seconds debounce

interface AutoSaveOptions {
  isDirty: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  draftId?: string;
  articleType: string;
}

export const useAutoSave = (
  saveCallback: () => Promise<void>,
  { isDirty, isSubmitting, isSaving, draftId, articleType }: AutoSaveOptions
) => {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { addDebugStep, updateLastStep } = useArticleDebug();

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    if (isDirty && !isSubmitting && !isSaving) {
      debounceTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = setTimeout(async () => {
          try {
            addDebugStep('Auto-saving draft (debounced)', {
              draftId,
              articleType,
              isUpdate: !!draftId
            });
            
            await saveCallback();
            
            updateLastStep('success', { 
              articleId: draftId, 
              source: 'auto-save' 
            });
          } catch (error) {
            logger.error(LogSource.EDITOR, 'Exception in auto-save', { error });
            updateLastStep('error', { error });
          }
        }, AUTO_SAVE_INTERVAL);
      }, AUTO_SAVE_DEBOUNCE);
    }
    
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, isSubmitting, isSaving, draftId, articleType, saveCallback, addDebugStep, updateLastStep]);
};
