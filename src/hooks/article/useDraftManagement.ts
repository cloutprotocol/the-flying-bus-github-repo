import { useCallback } from 'react';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import type { ArticleDebugStep } from '@/hooks/useArticleDebug';

export const useDraftManagement = () => {
  const { addDebugStep } = useArticleDebug();

  const saveDraft = useCallback(async (data: any) => {
    const debugStep: ArticleDebugStep = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: 'Draft saved',
      level: 'info',
      source: 'EDITOR'
    };
    addDebugStep(debugStep);
    
    // Simulate saving the draft
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Draft saved:', data);
  }, [addDebugStep]);

  return { saveDraft };
};
