
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface NavigationContextType {
  previousPath: string | null;
  navigationType: string;
  navigationCount: number;
}

const NavigationContext = createContext<NavigationContextType>({
  previousPath: null,
  navigationType: 'UNKNOWN',
  navigationCount: 0
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [navigationCount, setNavigationCount] = useState(0);
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Track navigation count and previous path
    setNavigationCount(count => count + 1);
    
    if (location.pathname !== previousPath && previousPath !== null) {
      logger.info(LogSource.NAVIGATION, 'Navigation occurred', {
        from: previousPath,
        to: location.pathname,
        navigationType,
        key: location.key
      });
    }
    
    // Update previous path after logging
    setPreviousPath(location.pathname);
    
  }, [location.pathname, location.key, navigationType]);

  const value = {
    previousPath,
    navigationType,
    navigationCount
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;
