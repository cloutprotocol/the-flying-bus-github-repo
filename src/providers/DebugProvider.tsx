
import React, { useState, useCallback } from 'react';
import { DebugContext } from '@/contexts/DebugContext';
import type { DebugStep, DebugStepStatus } from '@/types/DebugTypes';

interface DebugProviderProps {
  children: React.ReactNode;
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
