
import { useState, useCallback } from 'react';

export type ArticleDebugStep = {
  timestamp: string;
  action: string;
  details?: any;
  status: 'pending' | 'success' | 'error';
};

export function useArticleDebug() {
  const [debugSteps, setDebugSteps] = useState<ArticleDebugStep[]>([]);

  const addDebugStep = useCallback((action: string, details?: any, status: ArticleDebugStep['status'] = 'pending') => {
    setDebugSteps(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action,
      details,
      status
    }]);
  }, []);

  const updateLastStep = useCallback((status: ArticleDebugStep['status'], details?: any) => {
    setDebugSteps(prev => {
      if (!prev.length) return prev;
      const lastStep = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...lastStep, status, ...(details ? { details } : {}) }
      ];
    });
  }, []);

  const clearDebugSteps = useCallback(() => {
    setDebugSteps([]);
  }, []);

  return {
    debugSteps,
    addDebugStep,
    updateLastStep,
    clearDebugSteps
  };
}
