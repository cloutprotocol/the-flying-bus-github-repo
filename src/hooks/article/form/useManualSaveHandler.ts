import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import type { DebugStep } from '@/types/DebugTypes';

export const useManualSaveHandler = (articleId?: string) => {
  const { toast } = useToast();
  const { addDebugStep } = useArticleDebug();

  const handleManualSave = useCallback(async (formData: any) => {
    try {
      const result = await saveDraftOptimized('user-123', { ...formData, id: articleId });

      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your article has been saved as a draft.",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to save draft: ${result.error || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `An unexpected error occurred while saving the draft.`,
        variant: "destructive",
      });
    }
    
    const debugStep: DebugStep = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: 'Manual save completed',
      level: 'info',
      source: 'EDITOR'
    };
    addDebugStep(debugStep);
    
  }, [toast, addDebugStep, articleId]);

  return { handleManualSave };
};
