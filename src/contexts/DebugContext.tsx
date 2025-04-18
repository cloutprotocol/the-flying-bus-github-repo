
import React, { createContext, useContext, useState, useCallback } from 'react';

export type DebugStep = {
  timestamp: string;
  action: string;
  details?: any;
  status: 'pending' | 'success' | 'error';
};

interface DebugContextType {
  steps: DebugStep[];
  addStep: (action: string, details?: any, status?: DebugStep['status']) => void;
  updateLastStep: (status: DebugStep['status'], details?: any) => void;
  clearSteps: () => void;
}

// Export the context so it can be imported directly
export const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [steps, setSteps] = useState<DebugStep[]>([]);

  const addStep = useCallback((action: string, details?: any, status: DebugStep['status'] = 'pending') => {
    setSteps(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action,
      details,
      status
    }]);
  }, []);

  const updateLastStep = useCallback((status: DebugStep['status'], details?: any) => {
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

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};
