
import React from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const MyArticles = () => {
  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Articles</h1>
            <p className="text-muted-foreground">
              Manage your written articles, drafts, and submissions
            </p>
          </div>
          <Button className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4 mr-1" />
            New Article
          </Button>
        </div>
        
        <div className="bg-white rounded-md shadow p-6">
          <p className="text-center text-gray-500 py-8">
            You haven't created any articles yet. Click "New Article" to get started.
          </p>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default MyArticles;
