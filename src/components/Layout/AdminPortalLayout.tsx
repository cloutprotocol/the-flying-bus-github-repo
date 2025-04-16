
import React from 'react';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import AuthDebugPanel from '@/components/Debug/AuthDebugPanel';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
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
