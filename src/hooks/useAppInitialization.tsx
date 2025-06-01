
import React, { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface AppInitializationContextType {
  isInitialized: boolean;
  initializationError: string | null;
}

const AppInitializationContext = createContext<AppInitializationContextType | undefined>(undefined);

export const useAppInitialization = () => {
  const context = useContext(AppInitializationContext);
  if (context === undefined) {
    throw new Error('useAppInitialization must be used within an AppInitializationProvider');
  }
  return context;
};

export const AppInitializationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info(LogSource.SYSTEM, 'Application initializing...');
        
        // Add initialization logic here
        
        setIsInitialized(true);
        logger.info(LogSource.SYSTEM, 'Application initialized successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        setInitializationError(errorMessage);
        logger.error(LogSource.SYSTEM, 'Application initialization failed', { error });
      }
    };

    initializeApp();
  }, []);

  return (
    <AppInitializationContext.Provider value={{ isInitialized, initializationError }}>
      {children}
    </AppInitializationContext.Provider>
  );
};
