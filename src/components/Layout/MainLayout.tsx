
import React, { useEffect, useRef, memo } from 'react';
import ModernHeader from './ModernHeader';
import Footer from './Footer';
import AuthDebugPanel from '@/components/Debug/AuthDebugPanel';
import { useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useNavigation } from '@/contexts/NavigationContext';

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = memo(({ children, fullWidth = false }) => {
  const location = useLocation();
  const { isTransitioning } = useNavigation();
  const mainRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  
  useEffect(() => {
    if (!mountedRef.current) {
      logger.info(LogSource.APP, 'MainLayout mounted', {
        pathname: location.pathname,
        key: location.key
      });
      mountedRef.current = true;
    }
    
    // Set header height for consistent spacing
    const headerHeight = document.querySelector('header')?.offsetHeight || 80;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    
    return () => {
      logger.info(LogSource.APP, 'MainLayout unmounted', {
        pathname: location.pathname,
        key: location.key
      });
      mountedRef.current = false;
    };
  }, []);

  // Scroll to top on location change
  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-flyingbus-background">
      <AuthDebugPanel />
      <ModernHeader />
      <main 
        ref={mainRef}
        className={`flex-grow w-full transition-opacity duration-300 ${
          isTransitioning ? 'opacity-95' : 'opacity-100'
        }`}
        tabIndex={-1} // Make it focusable for accessibility
      >
        {fullWidth ? (
          <div className="w-full px-4 py-4">
            {children}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-4">
            {children}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;
