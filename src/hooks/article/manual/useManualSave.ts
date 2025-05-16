import { useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';

export interface ManualSaveOptions {
  draftId?: string;
  articleType: string;
  setSaving: (isSaving: boolean) => void;
  setSaveStatus: (status: DraftSaveStatus) => void;
  setLastSaved: (date: Date | null) => void;
  saveDraft: (formData: any) => Promise<{ success: boolean; articleId?: string; error?: any }>;
  setDraftId?: (id: string) => void;
}

export function useManualSave({
  draftId,
  articleType,
  setSaving,
  setSaveStatus,
  setLastSaved,
  saveDraft,
  setDraftId
}: ManualSaveOptions) {
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  // Prevent duplicate save calls
  const savingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Keep track of if component is mounted
  const setupMountedRef = () => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  };

  const handleSaveDraft = async (formData: any): Promise<boolean> => {
    // Prevent duplicate save calls
    if (savingRef.current) {
      console.log("Save already in progress, skipping duplicate call");
      return false;
    }
    
    try {
      savingRef.current = true;
      setSaving(true);
      setSaveStatus('saving');
      
      logger.info(LogSource.EDITOR, 'Manual draft save called', {
        contentLength: formData.content?.length || 0,
        draftId
      });
      
      addDebugStep('Manually saving draft', {
        draftId,
        articleType,
        isUpdate: !!draftId
      });
      
      const result = await saveDraft(formData);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to save your draft. Please try again.",
          variant: "destructive"
        });
        updateLastStep('error', { error: result.error });
        setSaveStatus('error');
        return false;
      }
      
      // Update draft ID if this was first save
      if (!draftId && result.articleId && setDraftId) {
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
      
      return true;
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in manual draft save', { error });
      updateLastStep('error', { error });
      setSaveStatus('error');
      
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving your draft.",
        variant: "destructive"
      });
      return false;
      
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
      savingRef.current = false; // Reset the saving flag
    }
  };

  return {
    handleSaveDraft,
    setupMountedRef
  };
}
