
import React from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModeratorDashboard from '@/components/Admin/Moderation/ModeratorDashboard';
import CommentModerationFilters from '@/components/Admin/Moderation/CommentModerationFilters';
import CommentModerationContent from '@/components/Admin/Moderation/CommentModerationContent';
import useCommentModeration from '@/hooks/useCommentModeration';

const CommentModeration = () => {
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
    onReject
  } = useCommentModeration();

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comment Moderation</h1>
          <p className="text-muted-foreground">
            Review, approve, or remove comments flagged for moderation
          </p>
        </div>

        <Tabs defaultValue="comments">
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
            
            <div className="mt-4">
              <Tabs defaultValue={filter} value={filter}>
                <TabsContent value={filter}>
                  <CommentModerationContent
                    loading={loading}
                    comments={comments}
                    totalCount={totalCount}
                    processingIds={processingIds}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
};

export default CommentModeration;
