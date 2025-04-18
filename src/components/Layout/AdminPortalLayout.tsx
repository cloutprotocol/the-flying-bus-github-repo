
import React from 'react';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const { currentUser } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default AdminPortalLayout;
