
import React, { useState, useEffect } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import ApprovalQueueList, { ArticleReviewItem } from '@/components/Admin/ApprovalQueue/ApprovalQueueList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { getArticlesForApproval } from '@/services/approvalService';
import { useToast } from '@/components/ui/use-toast';
import { reviewArticle } from '@/services/articleService';
import ErrorDisplay from '@/components/Admin/Common/ErrorDisplay';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const ApprovalQueue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [articles, setArticles] = useState<ArticleReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info(LogSource.APPROVAL, 'Fetching approval queue', {
        status: statusFilter,
        category: categoryFilter,
        search: searchTerm
      });
      
      const { articles: fetchedArticles, error: fetchError } = await getArticlesForApproval(
        statusFilter, 
        categoryFilter, 
        searchTerm
      );
      
      if (fetchError) {
        logger.error(LogSource.APPROVAL, 'Error fetching approval queue', fetchError);
        throw new Error(fetchError.message || 'Could not load the approval queue');
      }
      
      setArticles(fetchedArticles);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      
      // Log the error for debugging
      logger.error(LogSource.APPROVAL, 'Exception fetching approval queue', err);
      
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchArticles();
  }, [statusFilter, categoryFilter, searchTerm]);

  const handleStatusChange = async (articleId: string, newStatus: 'published' | 'rejected' | 'draft') => {
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
        // Update local state
        setArticles(prevArticles => 
          prevArticles.filter(article => article.id !== articleId)
        );
        
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
                  message={error.message}
                  details={error.stack}
                  onRetry={fetchArticles}
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
