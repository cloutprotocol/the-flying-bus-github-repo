
import { useDebugContext } from '@/hooks/debug/useDebugContext';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DebugStep } from '@/types/DebugTypes';

export type ArticleDebugStep = DebugStep;

export function useArticleDebug() {
  const context = useDebugContext();
  
  if (!context) {
    logger.debug(LogSource.EDITOR, 'Article debug context not available, using fallback');
    
    return {
      debugSteps: [],
      addDebugStep: (step: Omit<DebugStep, 'timestamp'>) => {
        logger.debug(LogSource.EDITOR, 'Article debug step added (fallback)', { 
          action: step.action,
          status: step.status,
          details: step.details 
        });
      },
      updateLastStep: (updates: Partial<DebugStep>) => {
        logger.debug(LogSource.EDITOR, 'Article debug step updated (fallback)', updates);
      },
      clearDebugSteps: () => {
        logger.debug(LogSource.EDITOR, 'Article debug steps cleared (fallback)');
      }
    };
  }
  
  return {
    debugSteps: context.steps,
    addDebugStep: context.addStep,
    updateLastStep: context.updateLastStep,
    clearDebugSteps: context.clearSteps
  };
}
