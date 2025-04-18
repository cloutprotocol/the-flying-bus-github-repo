
import { useContext } from 'react';
import { DebugContext, DebugStep } from '@/contexts/DebugContext';

export type ArticleDebugStep = DebugStep;

export function useArticleDebug() {
  const context = useContext(DebugContext);
  
  if (context === undefined) {
    // Provide a fallback implementation when the context is not available
    // This allows the hook to be used outside of a DebugProvider without errors
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
