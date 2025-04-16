
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, XCircle, Eye, Loader2 } from 'lucide-react';
import StatusDropdown from '@/components/Admin/Status/StatusDropdown';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import ReviewForm from '@/components/Admin/Reviews/ReviewForm';
import ReviewsList from '@/components/Admin/Reviews/ReviewsList';
import { ReviewCommentType } from '@/components/Admin/Reviews/ReviewComment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { getDraftById } from '@/services/draftService';
import { reviewArticle } from '@/services/articleService';
import { Skeleton } from '@/components/ui/skeleton';

const ArticleReview = () => {
  const { articleId = '' } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusType>('pending');
  const [comments, setComments] = useState<ReviewCommentType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      setLoading(true);
      try {
        const { draft, error } = await getDraftById(articleId);
        
        if (error) {
          console.error('Error fetching article:', error);
          toast({
            title: "Error",
            description: "Could not load the article for review",
            variant: "destructive"
          });
        } else if (draft) {
          setArticle(draft);
          setStatus(draft.status as StatusType);
        }
      } catch (err) {
        console.error('Exception fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
    
    // TODO: Fetch review comments from the backend
    // This would be implemented in a separate service function
  }, [articleId, toast]);

  const handleStatusChange = (newStatus: StatusType) => {
    setStatus(newStatus);
    // We'll use our reviewArticle function for the actual approval/rejection
  };

  const handleSubmitReview = (content: string, isPrivate: boolean) => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newComment: ReviewCommentType = {
        id: `comment-${Date.now()}`,
        authorName: 'Current User', // This would come from auth context in a real app
        content,
        createdAt: new Date(),
        isPrivate,
      };
      
      setComments([newComment, ...comments]);
      setIsSubmitting(false);
      
      toast({
        title: "Review submitted",
        description: "Your feedback has been added to the review",
      });
    }, 500);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(comment => comment.id !== commentId));
    
    toast({
      title: "Comment deleted",
      description: "The comment has been removed from the review",
    });
  };

  const handleApprove = async () => {
    if (!articleId) return;
    
    setActionInProgress(true);
    try {
      const { success, error } = await reviewArticle(articleId, { 
        status: 'published',
        feedback: 'Article approved for publication' 
      });
      
      if (success) {
        setStatus('published');
        toast({
          title: "Article published",
          description: "The article has been approved and published",
        });
        
        // Navigate back after a short delay
        setTimeout(() => navigate('/admin/approval-queue'), 1000);
      } else {
        console.error('Error approving article:', error);
        toast({
          title: "Error",
          description: "There was a problem publishing the article",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Exception approving article:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!articleId) return;
    
    setActionInProgress(true);
    try {
      const { success, error } = await reviewArticle(articleId, { 
        status: 'rejected',
        feedback: 'Article requires revisions before it can be published' 
      });
      
      if (success) {
        setStatus('rejected');
        toast({
          title: "Article rejected",
          description: "The article has been rejected and returned to the author",
        });
        
        // Navigate back after a short delay
        setTimeout(() => navigate('/admin/approval-queue'), 1000);
      } else {
        console.error('Error rejecting article:', error);
        toast({
          title: "Error",
          description: "There was a problem rejecting the article",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Exception rejecting article:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <AdminPortalLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                disabled
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Review Article</h1>
                <p className="text-muted-foreground">
                  Provide feedback and review the article before publication
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </AdminPortalLayout>
    );
  }

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/admin/approval-queue')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Review Article</h1>
              <p className="text-muted-foreground">
                Provide feedback and review the article before publication
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <StatusDropdown 
              currentStatus={status} 
              onStatusChange={handleStatusChange}
              userRole="moderator"
              articleId={articleId}
            />
            
            <Button 
              variant="outline" 
              onClick={() => window.open(`/articles/${articleId}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleReject}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{article?.title || 'Untitled Article'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="font-medium">By {article?.author || 'Unknown Author'}</p>
                  <p className="text-muted-foreground">{article?.excerpt || 'No excerpt available'}</p>
                  <div dangerouslySetInnerHTML={{ __html: article?.content || 'No content available' }} />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="all" className="flex-1">All Comments</TabsTrigger>
                    <TabsTrigger value="public" className="flex-1">Public Only</TabsTrigger>
                    <TabsTrigger value="private" className="flex-1">Internal Only</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <ReviewsList 
                      comments={comments} 
                      onDeleteComment={handleDeleteComment} 
                      showPrivateComments={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="public">
                    <ReviewsList 
                      comments={comments.filter(c => !c.isPrivate)} 
                      onDeleteComment={handleDeleteComment}
                    />
                  </TabsContent>
                  
                  <TabsContent value="private">
                    <ReviewsList 
                      comments={comments.filter(c => c.isPrivate)} 
                      onDeleteComment={handleDeleteComment}
                      showPrivateComments={true}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Add Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewForm 
                  onSubmit={handleSubmitReview}
                  isSubmitting={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default ArticleReview;
