
import { createContext, useContext } from 'react';
import type { DebugStep } from '@/types/DebugTypes';

export interface DebugContextType {
  steps: DebugStep[];
  addStep: (action: string, details?: any, status?: DebugStep['status']) => void;
  updateLastStep: (status: DebugStep['status'], details?: any) => void;
  clearSteps: () => void;
}

export const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function useDebugContext() {
  const context = useContext(DebugContext);
  
  if (context === undefined) {
    throw new Error('useDebugContext must be used within a DebugProvider');
  }
  
  return context;
}
