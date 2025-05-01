
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ModerationComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  articleId: string;
  articleTitle?: string;
  createdAt: Date;
  status: string;
  flagReason?: string;
  reportedBy?: string;
  reportedAt?: Date | null;
}

export interface ModerationCommentListProps {
  comments: ModerationComment[];
  onApprove: (commentId: string) => void;
  onReject: (commentId: string) => void;
  processingIds: string[];
}

const ModerationCommentList: React.FC<ModerationCommentListProps> = ({
  comments,
  onApprove,
  onReject,
  processingIds
}) => {
  if (comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No comments found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'flagged':
        return 'bg-amber-100 text-amber-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'published':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author?.avatar} alt={comment.author?.name || 'User'} />
                    <AvatarFallback>{(comment.author?.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{comment.author?.name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">
                      {comment.createdAt 
                        ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                        : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onApprove(comment.id)}
                          disabled={processingIds.includes(comment.id) || comment.status === 'published'}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {processingIds.includes(comment.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {comment.status === 'published' ? 'Already approved' : 'Approve this comment'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReject(comment.id)}
                          disabled={processingIds.includes(comment.id) || comment.status === 'rejected'}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {processingIds.includes(comment.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {comment.status === 'rejected' ? 'Already rejected' : 'Reject this comment'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="text-sm">{comment.content}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                  getStatusColor(comment.status)
                }`}>
                  {comment.status === 'published' ? 'Approved' : 
                    comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
                </span>
                
                {comment.articleId && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    <Info className="h-3 w-3 mr-1" />
                    Article: {comment.articleTitle || comment.articleId}
                  </span>
                )}
              </div>
            </div>
            
            {comment.flagReason && (
              <div className="bg-amber-50 p-3 text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mr-1" />
                  <p className="font-medium text-amber-800">Flag reason:</p>
                </div>
                <p className="text-amber-700 mt-1">{comment.flagReason}</p>
                {comment.reportedBy && (
                  <p className="text-xs text-amber-600 mt-1">
                    Reported by: {comment.reportedBy} {comment.reportedAt && (
                      <>· {formatDistanceToNow(new Date(comment.reportedAt), { addSuffix: true })}</>
                    )}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ModerationCommentList;
