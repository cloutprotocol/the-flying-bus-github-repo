
import { useState } from 'react';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';
import { useToast } from '@/hooks/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export const useDraftState = (initialDraftId?: string) => {
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();

  const handleSaveDraft = async (formData: any): Promise<string | undefined> => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      addDebugStep('Manually saving draft', {
        draftId,
        isUpdate: !!draftId
      });
      
      const result = await articleSubmissionService.saveDraft(draftId || '', formData);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to save your draft. Please try again.",
          variant: "destructive"
        });
        updateLastStep('error', { error: result.error });
        setSaveStatus('error');
        return undefined;
      }
      
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      updateLastStep('success', { 
        articleId: result.articleId,
        source: 'manual-save'
      });
      
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully.",
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

  return {
    draftId,
    setDraftId,
    isSaving,
    setIsSaving,
    saveStatus,
    setSaveStatus,
    lastSaved,
    setLastSaved,
    handleSaveDraft
  };
};
