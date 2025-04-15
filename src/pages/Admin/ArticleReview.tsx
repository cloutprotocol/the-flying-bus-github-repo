
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, XCircle, Eye } from 'lucide-react';
import StatusDropdown from '@/components/Admin/Status/StatusDropdown';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import ReviewForm from '@/components/Admin/Reviews/ReviewForm';
import ReviewsList from '@/components/Admin/Reviews/ReviewsList';
import { ReviewCommentType } from '@/components/Admin/Reviews/ReviewComment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

// Mock article data
const MOCK_ARTICLE = {
  id: '1',
  title: 'The Future of Ocean Conservation',
  author: 'Jamie Smith',
  status: 'pending' as StatusType,
  excerpt: 'Exploring the latest technologies and initiatives helping to protect our oceans for future generations.',
  content: 'Lorem ipsum dolor sit amet...',
  submittedAt: new Date('2025-04-10T10:30:00'),
  category: 'Headliners',
};

// Mock review comments
const MOCK_COMMENTS: ReviewCommentType[] = [
  {
    id: '1',
    authorName: 'Editor Alice',
    content: 'Please add more details about the conservation technologies discussed in paragraph 3.',
    createdAt: new Date('2025-04-12T14:30:00'),
    isPrivate: false,
  },
  {
    id: '2',
    authorName: 'Moderator Bob',
    content: 'This article needs citations for the statistics presented in the introduction.',
    createdAt: new Date('2025-04-11T09:15:00'),
    isPrivate: false,
  },
  {
    id: '3',
    authorName: 'Admin Charlie',
    content: 'Internal note: This is a high-priority piece for our environmental focus week.',
    createdAt: new Date('2025-04-10T16:45:00'),
    isPrivate: true,
  }
];

const ArticleReview = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusType>(MOCK_ARTICLE.status);
  const [comments, setComments] = useState<ReviewCommentType[]>(MOCK_COMMENTS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In a real app, we would fetch the article and comments based on articleId

  const handleStatusChange = (newStatus: StatusType) => {
    setStatus(newStatus);
    // In a real app, update status in the database
    
    toast({
      title: "Status updated",
      description: `Article status changed to ${newStatus}`,
    });
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

  const handleApprove = () => {
    handleStatusChange('published');
    // Navigate back after a short delay
    setTimeout(() => navigate('/admin/approval-queue'), 500);
  };

  const handleReject = () => {
    handleStatusChange('rejected');
    // Navigate back after a short delay
    setTimeout(() => navigate('/admin/approval-queue'), 500);
  };

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
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{MOCK_ARTICLE.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="font-medium">By {MOCK_ARTICLE.author}</p>
                  <p className="text-muted-foreground">{MOCK_ARTICLE.excerpt}</p>
                  <p>{MOCK_ARTICLE.content}</p>
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
