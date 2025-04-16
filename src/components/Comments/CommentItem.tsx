
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ThumbsUp, Flag, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ValidatedCommentForm from './ValidatedCommentForm';
import ReportContentButton from '@/components/Common/ReportContentButton';

export interface CommentData {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  isLiked?: boolean;
  replies?: CommentData[];
}

interface CommentItemProps {
  comment: CommentData;
  articleId: string;
  isReply?: boolean;
  depth?: number;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  articleId,
  isReply = false,
  depth = 0,
  onLike,
  onReply,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { currentUser, isLoggedIn } = useAuth();
  
  const isAuthor = currentUser?.id === comment.author.id;
  const maxDepth = 3; // Maximum nesting level for replies
  
  const handleLike = () => {
    if (onLike) {
      onLike(comment.id);
    }
  };
  
  const handleReplySubmitted = () => {
    setShowReplyForm(false);
  };
  
  return (
    <div className={`comment-item ${isReply ? 'pl-6 border-l border-gray-100' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
          <AvatarFallback>{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex items-center">
              <ReportContentButton
                contentId={comment.id}
                contentType="comment"
                variant="ghost"
                buttonSize="icon"
              />
              
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          <div className="text-sm">{comment.content}</div>
          
          <div className="flex items-center gap-2 pt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-muted-foreground"
              onClick={handleLike}
              disabled={!isLoggedIn}
            >
              <ThumbsUp className={`h-4 w-4 mr-1 ${comment.isLiked ? 'fill-current text-blue-500' : ''}`} />
              {comment.likes > 0 && comment.likes}
            </Button>
            
            {depth < maxDepth && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-muted-foreground"
                onClick={() => setShowReplyForm(!showReplyForm)}
                disabled={!isLoggedIn}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Reply
              </Button>
            )}
          </div>
          
          {showReplyForm && (
            <div className="mt-3">
              <ValidatedCommentForm
                articleId={articleId}
                parentId={comment.id}
                onCommentSubmitted={handleReplySubmitted}
                placeholder={`Reply to ${comment.author.name}...`}
              />
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  articleId={articleId}
                  isReply={true}
                  depth={depth + 1}
                  onLike={onLike}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
