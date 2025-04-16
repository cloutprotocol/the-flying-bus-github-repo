
import React from 'react';
import ModernHeader from './ModernHeader';
import Footer from './Footer';
import AuthDebugPanel from '@/components/Debug/AuthDebugPanel';

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayout = ({ children, fullWidth = false }: MainLayoutProps) => {
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
