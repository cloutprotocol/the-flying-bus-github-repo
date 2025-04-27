
import React, { useEffect } from 'react';
import ModernHeader from './ModernHeader';
import Footer from './Footer';
import AuthDebugPanel from '@/components/Debug/AuthDebugPanel';
import { useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayout = ({ children, fullWidth = false }: MainLayoutProps) => {
  const location = useLocation();
  
  useEffect(() => {
    logger.info(LogSource.APP, 'MainLayout mounted', {
      pathname: location.pathname,
      key: location.key
    });
    
    // Set header height for consistent spacing
    const headerHeight = document.querySelector('header')?.offsetHeight || 80;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    
    return () => {
      logger.info(LogSource.APP, 'MainLayout unmounted', {
        pathname: location.pathname,
        key: location.key
      });
    };
  }, [location.pathname, location.key]);

  return (
    <div className="flex flex-col min-h-screen bg-flyingbus-background">
      <AuthDebugPanel />
      <ModernHeader />
      <main className="flex-grow w-full">
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
};

export default MainLayout;
