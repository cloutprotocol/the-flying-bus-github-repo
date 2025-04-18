
import React, { useState, useCallback, createContext, ReactNode } from 'react';
import type { DebugStep, DebugStepStatus } from '@/types/DebugTypes';

export interface DebugContextType {
  steps: DebugStep[];
  addStep: (action: string, details?: any, status?: DebugStepStatus) => void;
  updateLastStep: (status: DebugStepStatus, details?: any) => void;
  clearSteps: () => void;
}

export const DebugContext = createContext<DebugContextType | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
}

export const DebugProvider: React.FC<DebugProviderProps> = ({ children }) => {
  const [steps, setSteps] = useState<DebugStep[]>([]);

  const addStep = useCallback((action: string, details?: any, status: DebugStepStatus = 'pending') => {
    setSteps(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action,
      details,
      status
    }]);
  }, []);

  const updateLastStep = useCallback((status: DebugStepStatus, details?: any) => {
    setSteps(prev => {
      if (!prev.length) return prev;
      const lastStep = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { 
          ...lastStep, 
          status, 
          details: details ? { ...lastStep.details, ...details } : lastStep.details 
        }
      ];
    });
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  const value = {
    steps,
    addStep,
    updateLastStep,
    clearSteps
  };

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
};

export function useDebugContext() {
  const context = React.useContext(DebugContext);
  
  if (context === undefined) {
    throw new Error('useDebugContext must be used within a DebugProvider');
  }
  
  return context;
}
