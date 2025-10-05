/**
 * Article Review Status Component
 * 
 * Shows review status and history for authors
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  User,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  getArticleReviewHistory,
  ArticleReview
} from '@/services/articleReviewWorkflowService';
import { ownershipUIUtils } from '@/services/articleOwnershipService';

interface ArticleReviewStatusProps {
  articleId: string;
  articleTitle: string;
  currentStatus: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  submittedAt?: string;
  className?: string;
}

export const ArticleReviewStatus: React.FC<ArticleReviewStatusProps> = ({
  articleId,
  articleTitle,
  currentStatus,
  submittedAt,
  className
}) => {
  const [reviewHistory, setReviewHistory] = useState<ArticleReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchReviewHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getArticleReviewHistory(articleId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setReviewHistory(result.reviews);
    } catch (err) {
      console.error('Error fetching review history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load review history');
    } finally {
      setLoading(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    if (reviewHistory.length === 0) {
      fetchReviewHistory();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'published':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'draft':
        return 'This article is still in draft. Submit it for review when ready.';
      case 'pending_review':
        return 'Your article is being reviewed by our editorial team. We\'ll notify you once it\'s been reviewed.';
      case 'approved':
        return 'Great! Your article has been approved and will be published soon.';
      case 'rejected':
        return 'Your article needs some changes before it can be published. Please review the feedback and resubmit.';
      case 'published':
        return 'Congratulations! Your article has been published and is now live.';
      default:
        return 'Status unknown.';
    }
  };

  const getStatusColor = (status: string) => {
    const color = ownershipUIUtils.getStatusBadgeColor(status);
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      gray: 'secondary',
      yellow: 'outline',
      green: 'default',
      red: 'destructive',
      blue: 'default'
    };
    return variantMap[color] || 'secondary';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(currentStatus)}
            Review Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={getStatusColor(currentStatus)}>
                {ownershipUIUtils.getStatusText(currentStatus)}
              </Badge>
            </div>
            {submittedAt && (
              <div className="text-sm text-muted-foreground">
                Submitted {formatDate(submittedAt)}
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {getStatusMessage(currentStatus)}
          </p>
          
          {currentStatus !== 'draft' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleShowHistory}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                View Review History
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review History</DialogTitle>
            <DialogDescription>
              Review history for "{articleTitle}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading review history: {error}
                </AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : reviewHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No review history available yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {reviewHistory.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(review.status)}
                          <span className="font-medium">
                            {ownershipUIUtils.getStatusText(review.status)}
                          </span>
                        </div>
                        <Badge variant={getStatusColor(review.status)}>
                          {review.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {review.reviewer?.display_name || 'Unknown Reviewer'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(review.created_at)}
                        </div>
                      </div>
                      
                      {review.feedback && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-sm">{review.feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowHistory(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArticleReviewStatus;