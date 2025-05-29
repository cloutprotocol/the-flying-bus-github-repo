
import React from 'react';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';
import { ArticleTypeSelectionProvider, useArticleTypeSelection } from '@/contexts/ArticleTypeSelectionContext';
import ArticleTypeSelectionModal from '@/components/Admin/ArticleEditor/ArticleTypeSelectionModal';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminPortalLayoutContent: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { isModalOpen, closeModal } = useArticleTypeSelection();
  
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
      
      <ArticleTypeSelectionModal 
        open={isModalOpen} 
        onOpenChange={closeModal} 
      />
    </div>
  );
};

const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  return (
    <ArticleTypeSelectionProvider>
      <AdminPortalLayoutContent>{children}</AdminPortalLayoutContent>
    </ArticleTypeSelectionProvider>
  );
};

export default AdminPortalLayout;
