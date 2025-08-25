import React, { useState, useEffect, useMemo } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import ApprovalQueueList, { ArticleReviewItem } from '@/components/Admin/ApprovalQueue/ApprovalQueueList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { useSimpleApprovalQueue } from '@/hooks/useSimpleApprovalQueue';
import { useToast } from '@/components/ui/use-toast';
import { reviewArticle } from '@/services/articleService';
import ErrorDisplay from '@/components/Admin/Common/ErrorDisplay';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

const ApprovalQueue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Use simple data loading for approval queue
  const { 
    data: articlesData, 
    isLoading: loading, 
    error, 
    refetch: refetchArticles 
  } = useSimpleApprovalQueue(statusFilter);
  
  // Transform and filter articles data
  const articles = useMemo(() => {
    if (!articlesData) return [];
    
    let filteredArticles = articlesData;
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filteredArticles = filteredArticles.filter(article => 
        article.categories?.name === categoryFilter
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.profiles?.display_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Transform to ArticleReviewItem format
    return filteredArticles.map(article => {
      // Assign priority based on age of submission
      const submissionDate = new Date(article.updated_at);
      const now = new Date();
      const daysDifference = Math.floor((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'low' | 'medium' | 'high' = 'low';
      if (daysDifference >= 7) priority = 'high';
      else if (daysDifference >= 3) priority = 'medium';
      
      return {
        id: article.id,
        title: article.title,
        author: article.profiles?.display_name || 'Unknown',
        status: article.status as StatusType,
        submittedAt: new Date(article.updated_at),
        category: article.categories?.name || 'Uncategorized',
        priority
      };
    });
  }, [articlesData, categoryFilter, searchTerm]);

  const handleStatusChange = async (articleId: string, newStatus: 'published' | 'rejected' | 'draft' | 'archived') => {
    setProcessingIds(prev => [...prev, articleId]);
    
    try {
      logger.info(LogSource.APPROVAL, `Changing article status to ${newStatus}`, {
        articleId, newStatus
      });
      
      const { success, error } = await reviewArticle(articleId, {
        status: newStatus,
        feedback: `Article status changed to ${newStatus}`
      });
      
      if (success) {
        // Refetch articles to update the list
        await refetchArticles();
        
        toast({
          title: `Article ${newStatus}`,
          description: `The article has been ${newStatus === 'published' ? 'published' : 
                         newStatus === 'rejected' ? 'rejected' : 'moved to drafts'}`,
        });
        
        logger.info(LogSource.APPROVAL, `Article status changed successfully`, {
          articleId, newStatus
        });
      } else {
        logger.error(LogSource.APPROVAL, `Error changing article status`, error);
        
        toast({
          title: "Error",
          description: `Could not change article status to ${newStatus}`,
          variant: "destructive"
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      
      logger.error(LogSource.APPROVAL, `Exception changing article status to ${newStatus}`, err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== articleId));
    }
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Review</h1>
          <p className="text-muted-foreground">
            Review and approve articles submitted by authors
          </p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles or authors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Headliners">Headliners</SelectItem>
                <SelectItem value="Debates">Debates</SelectItem>
                <SelectItem value="Spice It Up">Spice It Up</SelectItem>
                <SelectItem value="Storyboard">Storyboard</SelectItem>
                <SelectItem value="School News">School News</SelectItem>
                <SelectItem value="Learning">Learning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Tabs defaultValue="pending" onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={statusFilter} className="mt-4">
              {error ? (
                <ErrorDisplay
                  title="Failed to load articles"
                  message={error?.message || 'Unknown error occurred'}
                  details={error?.stack}
                  onRetry={() => refetchArticles()}
                  className="mb-4"
                />
              ) : loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ApprovalQueueList 
                  articles={articles} 
                  onStatusChange={handleStatusChange}
                  processingIds={processingIds}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default ApprovalQueue;
