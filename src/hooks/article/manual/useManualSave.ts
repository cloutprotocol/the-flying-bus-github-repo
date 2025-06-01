
import { useCallback } from 'react';
import { useArticleEditor } from '@/contexts/ArticleEditorContext';

export const useManualSave = () => {
  const { addDebugStep } = useArticleEditor();

  const performSave = useCallback(async (data: any) => {
    addDebugStep('Manual save performed');
  }, [addDebugStep]);

  return { performSave };
};
