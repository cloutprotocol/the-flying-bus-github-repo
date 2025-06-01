import { useCallback } from 'react';
import { useArticleEditorContext } from '@/contexts/ArticleEditorContext';
import type { DebugStep } from '@/types/DebugTypes';

export const useManualSave = () => {
  const { addDebugStep } = useArticleEditorContext();

  const performSave = useCallback(async (data: any) => {
    
    const debugStep: DebugStep = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: 'Manual save performed',
      level: 'info',
      source: 'EDITOR'
    };
    addDebugStep(debugStep);
    
  }, [addDebugStep]);

  return { performSave };
};
