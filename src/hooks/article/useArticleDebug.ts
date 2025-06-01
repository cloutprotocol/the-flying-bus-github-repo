
import { useDebugContext } from '@/hooks/debug/useDebugContext';
import type { DebugStep } from '@/types/DebugTypes';

export type ArticleDebugStep = DebugStep;

export function useArticleDebug() {
  const context = useDebugContext();
  
  if (!context) {
    return {
      debugSteps: [],
      addDebugStep: () => {},
      updateLastStep: () => {},
      clearDebugSteps: () => {}
    };
  }
  
  return {
    debugSteps: context.steps,
    addDebugStep: context.addStep,
    updateLastStep: context.updateLastStep,
    clearDebugSteps: context.clearSteps
  };
}
