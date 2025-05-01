
import React, { useState, useEffect } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModeratorDashboard from '@/components/Admin/Moderation/ModeratorDashboard';
import CommentModerationFilters from '@/components/Admin/Moderation/CommentModerationFilters';
import CommentModerationContent from '@/components/Admin/Moderation/CommentModerationContent';
import useCommentModeration from '@/hooks/useCommentModeration';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const CommentModeration = () => {
  const [activeTab, setActiveTab] = useState('comments');
  
  const {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    comments,
    totalCount,
    loading,
    processingIds,
    onApprove,
    onReject,
    loadMoreComments,
    refreshComments
  } = useCommentModeration();

  // Refresh comments when switching back to the comments tab
  useEffect(() => {
    if (activeTab === 'comments') {
      refreshComments();
    }
  }, [activeTab, refreshComments]);

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comment Moderation</h1>
          <p className="text-muted-foreground">
            Review, approve, or remove comments flagged for moderation
          </p>
        </div>

        <Tabs 
          defaultValue="comments" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6">
            <ModeratorDashboard />
          </TabsContent>
          
          <TabsContent value="comments" className="mt-6">
            <CommentModerationFilters
              filter={filter}
              setFilter={setFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
            
            {processingIds.length > 0 && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Processing</AlertTitle>
                <AlertDescription>
                  Processing {processingIds.length} comment{processingIds.length > 1 ? 's' : ''}. Please wait...
                </AlertDescription>
              </Alert>
            )}
            
            <div className="mt-4">
              <CommentModerationContent
                loading={loading}
                comments={comments}
                totalCount={totalCount}
                processingIds={processingIds}
                onApprove={onApprove}
                onReject={onReject}
                loadMoreComments={loadMoreComments}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
};

export default CommentModeration;
