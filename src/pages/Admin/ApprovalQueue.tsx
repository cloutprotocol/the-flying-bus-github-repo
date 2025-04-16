
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

const ApprovalQueue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [articles, setArticles] = useState<ArticleReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const { articles: fetchedArticles, error } = await getArticlesForApproval(
          statusFilter, 
          categoryFilter, 
          searchTerm
        );
        
        if (error) {
          console.error('Error fetching approval queue:', error);
          toast({
            title: "Error",
            description: "Could not load the approval queue",
            variant: "destructive"
          });
        } else {
          setArticles(fetchedArticles);
        }
      } catch (err) {
        console.error('Exception fetching approval queue:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [statusFilter, categoryFilter, searchTerm, toast]);

  const handleStatusChange = async (articleId: string, newStatus: 'published' | 'rejected' | 'draft') => {
    setProcessingIds(prev => [...prev, articleId]);
    
    try {
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
      } else {
        console.error(`Error changing article status to ${newStatus}:`, error);
        toast({
          title: "Error",
          description: `Could not change article status to ${newStatus}`,
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error(`Exception changing article status to ${newStatus}:`, err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
              {loading ? (
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
