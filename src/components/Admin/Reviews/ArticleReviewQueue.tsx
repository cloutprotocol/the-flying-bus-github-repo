/**
 * Article Review Queue Component
 * 
 * Admin interface for reviewing author-submitted articles
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  getArticlesPendingReview,
  approveArticle,
  rejectArticle,
  getArticleReviewHistory,
  ArticleReview
} from '@/services/articleReviewWorkflowService';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';

interface PendingArticle {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_for_review_at: string;
  author_id: string;
  profiles?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface ArticleReviewQueueProps {
  className?: string;
}

export const ArticleReviewQueue: React.FC<ArticleReviewQueueProps> = ({ className }) => {
  const [articles, setArticles] = useState<PendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<PendingArticle | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<ArticleReview[]>([]);
  
  const { userRole } = useRoleBasedAccess();

  useEffect(() => {
    fetchPendingArticles();
  }, []);

  const fetchPendingArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getArticlesPendingReview();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setArticles(result.articles);
    } catch (err) {
      console.error('Error fetching pending articles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pending articles');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = async (article: PendingArticle, action: 'approve' | 'reject') => {
    setSelectedArticle(article);
    setReviewAction(action);
    setFeedback('');
    
    // Fetch review history for this article
    try {
      const historyResult = await getArticleReviewHistory(article.id);
      if (!historyResult.error) {
        setReviewHistory(historyResult.reviews);
      }
    } catch (err) {
      console.error('Error fetching review history:', err);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedArticle || !reviewAction) return;
    
    try {
      setSubmitting(true);
      
      let result;
      if (reviewAction === 'approve') {
        result = await approveArticle(selectedArticle.id, feedback);
      } else {
        if (!feedback.trim()) {
          alert('Feedback is required when rejecting an article.');
          return;
        }
        result = await rejectArticle(selectedArticle.id, feedback);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit review');
      }
      
      // Remove the article from the pending list
      setArticles(prev => prev.filter(a => a.id !== selectedArticle.id));
      
      // Close dialog
      setSelectedArticle(null);
      setReviewAction(null);
      setFeedback('');
      
      alert(`Article ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      
    } catch (err) {
      console.error('Error submitting review:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  // Only show to admin and moderator users
  if (!['admin', 'moderator'].includes(userRole)) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Article Review Queue</h2>
          <p className="text-muted-foreground">
            Review articles submitted by authors for publication
          </p>
        </div>
        <Button onClick={fetchPendingArticles} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading articles: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No articles are currently pending review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                      {article.content.substring(0, 200)}...
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {article.profiles?.display_name || 'Unknown Author'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Submitted {getTimeAgo(article.submitted_for_review_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(article.submitted_for_review_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">Pending Review</Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/articles/${article.id}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleReviewClick(article, 'approve')}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleReviewClick(article, 'reject')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => {
        setSelectedArticle(null);
        setReviewAction(null);
        setFeedback('');
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Article' : 'Reject Article'}
            </DialogTitle>
            <DialogDescription>
              {selectedArticle && (
                <>
                  <strong>{selectedArticle.title}</strong> by {selectedArticle.profiles?.display_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {reviewAction === 'approve' ? 'Feedback (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <Textarea
                placeholder={
                  reviewAction === 'approve' 
                    ? 'Add any feedback for the author...'
                    : 'Please explain why this article is being rejected...'
                }
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            
            {reviewHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Previous Reviews</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {reviewHistory.map((review) => (
                    <div key={review.id} className="text-xs p-2 bg-muted rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">
                          {review.reviewer?.display_name}
                        </span>
                        <Badge variant={review.status === 'approved' ? 'default' : 'destructive'}>
                          {review.status}
                        </Badge>
                      </div>
                      {review.feedback && (
                        <p className="text-muted-foreground">{review.feedback}</p>
                      )}
                      <p className="text-muted-foreground mt-1">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedArticle(null);
                setReviewAction(null);
                setFeedback('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={submitting || (reviewAction === 'reject' && !feedback.trim())}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {submitting ? 'Submitting...' : (
                reviewAction === 'approve' ? 'Approve Article' : 'Reject Article'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArticleReviewQueue;