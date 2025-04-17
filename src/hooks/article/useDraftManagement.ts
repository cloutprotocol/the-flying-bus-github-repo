
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { saveDraft } from '@/services/draftService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';

export function useDraftManagement(articleId?: string, articleType: string = 'standard') {
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  const saveDraftToServer = useCallback(async (formData: any, isDirty: boolean) => {
    if (!isDirty && draftId) {
      return { success: true, articleId: draftId };
    }
    
    try {
      setSaveStatus('saving');
      
      logger.info(LogSource.EDITOR, 'Saving draft', {
        draftId,
        articleType,
        isDirty
      });
      
      const result = await saveDraft(draftId || '', formData);
      
      if (result.error) {
        logger.error(LogSource.EDITOR, 'Error saving draft', { error: result.error });
        setSaveStatus('error');
        return { success: false, articleId: draftId };
      }
      
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      return { success: true, articleId: result.articleId || draftId };
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception saving draft', { error });
      setSaveStatus('error');
      return { success: false, articleId: draftId };
    }
  }, [draftId, articleType]);

  return {
    draftId,
    saveStatus,
    lastSaved,
    saveDraftToServer
  };
}
