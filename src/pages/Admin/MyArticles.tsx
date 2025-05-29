
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ArticleTypeSelectionModal from '@/components/Admin/ArticleEditor/ArticleTypeSelectionModal';
import { useArticleTypeSelection } from '@/hooks/useArticleTypeSelection';

const MyArticles = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { isModalOpen, openModal, closeModal } = useArticleTypeSelection();

  return (
    <>
      <AdminPortalLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Articles</h1>
              <p className="text-muted-foreground">
                Manage and view all your articles
              </p>
            </div>
            <Button onClick={openModal} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Article
            </Button>
          </div>

          <Card className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>

            <div className="text-center py-8 text-muted-foreground">
              <p>No articles found. Create your first article to get started!</p>
              <Button onClick={openModal} className="mt-4">
                Create Your First Article
              </Button>
            </div>
          </Card>
        </div>
      </AdminPortalLayout>

      <ArticleTypeSelectionModal 
        open={isModalOpen} 
        onOpenChange={closeModal} 
      />
    </>
  );
};

export default MyArticles;
