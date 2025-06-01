
import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { useArticleDebug } from '@/hooks/useArticleDebug';

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
    
    addDebugStep('Manual save completed');
    
  }, [toast, addDebugStep, articleId]);

  return { handleManualSave };
};
