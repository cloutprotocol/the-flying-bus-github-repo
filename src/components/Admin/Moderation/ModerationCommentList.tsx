
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ModerationCommentListProps {
  comments: any[]; // Changed from 'items' to 'comments' to match usage
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onApprove(comment.id)}
                    disabled={processingIds.includes(comment.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    {processingIds.includes(comment.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(comment.id)}
                    disabled={processingIds.includes(comment.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {processingIds.includes(comment.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
              <div className="text-sm">{comment.content}</div>
            </div>
            
            {comment.flagReason && (
              <div className="bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-800">Flag reason:</p>
                <p className="text-amber-700">{comment.flagReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ModerationCommentList;
