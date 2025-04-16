
import React from 'react';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import AuthDebugPanel from '@/components/Debug/AuthDebugPanel';
import { useAuth } from '@/hooks/useAuth';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const { currentUser, isLoggedIn, isLoading } = useAuth();
  
  // Show loading state while checking auth
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Checking permissions...</div>;
  }

  // Only render admin portal if user is authenticated and authorized
  // NOTE: We don't need to handle redirects here since ProtectedRoute will do that
  return (
    <div className="flex flex-col min-h-screen">
      <AuthDebugPanel />
      <AdminHeader />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default AdminPortalLayout;
