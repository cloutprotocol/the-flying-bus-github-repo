
import { useCallback } from 'react';
import { useArticleDebug } from '@/hooks/useArticleDebug';

export const useDraftManagement = () => {
  const { addDebugStep } = useArticleDebug();

  const saveDraft = useCallback(async (data: any) => {
    addDebugStep('Draft saved');
    
    // Simulate saving the draft
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Draft saved:', data);
  }, [addDebugStep]);

  return { saveDraft };
};
