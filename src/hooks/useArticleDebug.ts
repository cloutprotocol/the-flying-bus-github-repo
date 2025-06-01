
import { useContext } from 'react';
import { DebugContext, DebugContextType } from '@/contexts/DebugContext';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DebugStep } from '@/types/DebugTypes';

export type ArticleDebugStep = DebugStep;

export function useArticleDebug() {
  const context = useContext(DebugContext);
  
  if (context === undefined) {
    // Provide a fallback implementation when the context is not available
    logger.debug(LogSource.EDITOR, 'Debug context not available, using fallback implementation');
    
    return {
      debugSteps: [],
      addDebugStep: (step: Omit<DebugStep, 'timestamp'>) => {
        logger.debug(LogSource.EDITOR, 'Debug step added (fallback)', { 
          action: step.action,
          status: step.status,
          details: step.details 
        });
      },
      updateLastStep: (updates: Partial<DebugStep>) => {
        logger.debug(LogSource.EDITOR, 'Debug step updated (fallback)', updates);
      },
      clearDebugSteps: () => {
        logger.debug(LogSource.EDITOR, 'Debug steps cleared (fallback)');
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
