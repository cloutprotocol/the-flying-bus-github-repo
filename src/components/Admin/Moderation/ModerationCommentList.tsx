
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Flag, 
  AlertTriangle,
  Eye,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getFlaggedComments, approveComment, rejectComment } from '@/services/commentService';
import { Skeleton } from '@/components/ui/skeleton';

// Comment type now matches the return structure from our service
interface CommentType {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  articleId: string;
  articleTitle: string;
  createdAt: Date;
  status: string;
  reason: string;
  reportedBy: string;
}

interface ModerationCommentListProps {
  filter: string;
  searchTerm: string;
  onApprove: (commentId: string) => void;
  onReject: (commentId: string) => void;
}

const ModerationCommentList: React.FC<ModerationCommentListProps> = ({
  filter,
  searchTerm,
  onApprove,
  onReject
}) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        const { comments, count, error } = await getFlaggedComments(filter, searchTerm);
        if (error) {
          console.error('Error fetching comments:', error);
        } else {
          setComments(comments);
          setTotalCount(count);
        }
      } catch (err) {
        console.error('Error in fetching comments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [filter, searchTerm]);

  const handleApprove = async (commentId: string) => {
    setProcessingIds(prev => [...prev, commentId]);
    try {
      const { success, error } = await approveComment(commentId);
      if (success) {
        // Update the local state
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        onApprove(commentId);
      } else {
        console.error('Error approving comment:', error);
      }
    } catch (err) {
      console.error('Exception approving comment:', err);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  };

  const handleReject = async (commentId: string) => {
    setProcessingIds(prev => [...prev, commentId]);
    try {
      const { success, error } = await rejectComment(commentId);
      if (success) {
        // Update the local state
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        onReject(commentId);
      } else {
        console.error('Error rejecting comment:', error);
      }
    } catch (err) {
      console.error('Exception rejecting comment:', err);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'flagged':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Flag className="h-3 w-3 mr-1" /> Flagged
          </Badge>
        );
      case 'reported':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Reported
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <MessageSquare className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
              <div className="mt-4">
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No comments found matching your criteria.
          </CardContent>
        </Card>
      ) : (
        comments.map(comment => {
          const isProcessing = processingIds.includes(comment.id);
          
          return (
            <Card key={comment.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                        <AvatarFallback>{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{comment.author.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(comment.status)}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Comment Details</DialogTitle>
                            <DialogDescription>
                              Review the comment details before making a decision.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <h4 className="text-sm font-medium">Comment</h4>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium">Article</h4>
                                <p className="text-sm mt-1">{comment.articleTitle}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">Author</h4>
                                <p className="text-sm mt-1">{comment.author.name}</p>
                              </div>
                            </div>
                            {comment.reason && (
                              <div>
                                <h4 className="text-sm font-medium">Flagged Reason</h4>
                                <p className="text-sm mt-1">{comment.reason}</p>
                              </div>
                            )}
                            {comment.reportedBy && (
                              <div>
                                <h4 className="text-sm font-medium">Reported By</h4>
                                <p className="text-sm mt-1">{comment.reportedBy}</p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => handleReject(comment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Reject
                            </Button>
                            <Button 
                              onClick={() => handleApprove(comment.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <span className="text-xs font-medium text-muted-foreground">on article:</span>
                    <span className="text-xs ml-1">{comment.articleTitle}</span>
                  </div>
                  <p className="text-sm mb-4">{comment.content}</p>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleReject(comment.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleApprove(comment.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ModerationCommentList;
