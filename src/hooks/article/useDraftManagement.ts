
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
        toast({
          title: "Error",
          description: "There was a problem saving your draft.",
          variant: "destructive"
        });
        return { success: false, articleId: draftId };
      }
      
      const newArticleId = result.articleId || draftId;
      
      // Only update the draftId if we didn't have one before
      if (!draftId && newArticleId) {
        logger.info(LogSource.EDITOR, 'Setting new draft ID', { newArticleId });
        setDraftId(newArticleId);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      
      return { success: true, articleId: newArticleId };
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception saving draft', { error });
      setSaveStatus('error');
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving your draft.",
        variant: "destructive"
      });
      return { success: false, articleId: draftId };
    }
  }, [draftId, articleType, toast]);

  return {
    draftId,
    saveStatus,
    lastSaved,
    saveDraftToServer
  };
}
