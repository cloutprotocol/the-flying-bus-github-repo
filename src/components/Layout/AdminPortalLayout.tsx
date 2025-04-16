
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import AuthDebugPanel from '@/components/Debug/AuthDebugPanel';
import { useAuth } from '@/hooks/useAuth';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const { currentUser, isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If authentication is complete and user is not logged in or doesn't have proper role
    if (!isLoading) {
      if (!isLoggedIn) {
        console.log('Not logged in, redirecting to auth page');
        navigate('/reader-auth?tab=sign-in&redirect=/admin', { replace: true });
      } else if (currentUser) {
        const adminRoles = ['admin', 'moderator', 'author'];
        if (!adminRoles.includes(currentUser.role)) {
          console.log('User lacks admin role, redirecting to homepage');
          navigate('/', { replace: true });
        }
      }
    }
  }, [isLoggedIn, currentUser, isLoading, navigate]);

  // Show loading state while checking auth
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Checking permissions...</div>;
  }

  // Only render admin portal if user is authenticated and authorized
  if (isLoggedIn && currentUser && ['admin', 'moderator', 'author'].includes(currentUser.role)) {
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
  }

  // This is a fallback, the useEffect should redirect before this renders
  return <div className="flex justify-center items-center h-screen">Redirecting...</div>;
};

export default AdminPortalLayout;
