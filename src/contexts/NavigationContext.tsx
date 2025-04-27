
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface NavigationContextType {
  previousPath: string | null;
  navigationType: string;
  navigationCount: number;
  isTransitioning: boolean;
}

const NavigationContext = createContext<NavigationContextType>({
  previousPath: null,
  navigationType: 'UNKNOWN',
  navigationCount: 0,
  isTransitioning: false
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [navigationCount, setNavigationCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Track navigation count and previous path
    setNavigationCount(count => count + 1);
    
    if (location.pathname !== previousPath && previousPath !== null) {
      logger.info(LogSource.APP, 'Navigation occurred', {
        from: previousPath,
        to: location.pathname,
        navigationType,
        key: location.key
      });
      
      // Set transitioning state to true
      setIsTransitioning(true);
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      
      // Set a timeout to turn off the transitioning state
      transitionTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
        transitionTimeoutRef.current = null;
      }, 300); // 300ms should be enough for most transitions
    }
    
    // Update previous path after logging
    setPreviousPath(location.pathname);
    
    // Cleanup function to clear timeout on unmount
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [location.pathname, location.key, navigationType]);

  const value = {
    previousPath,
    navigationType,
    navigationCount,
    isTransitioning
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;
