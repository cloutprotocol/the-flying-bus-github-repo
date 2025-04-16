
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
import { useCommentLikes } from '@/hooks/useCommentLikes';
import ReplyForm from './ReplyForm';

export interface CommentAuthor {
  id?: string;
  name: string;
  avatar?: string;
  badges?: string[];
}

export interface CommentData {
  id: string;
  content: string;
  createdAt: Date;
  author: CommentAuthor;
  likes: number;
  isLiked?: boolean;
  replies?: CommentData[];
  articleId: string;
  isModerator?: boolean;
  isVerified?: boolean;
}

export interface CommentProps extends CommentData {
  isReply?: boolean;
  depth?: number;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
}

const CommentItem: React.FC<CommentProps> = ({
  id,
  content,
  createdAt,
  author,
  likes: initialLikes,
  isLiked: initialIsLiked,
  replies,
  articleId,
  isReply = false,
  depth = 0,
  onLike,
  onReply,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { currentUser, isLoggedIn } = useAuth();
  const { likes, hasLiked, handleLike } = useCommentLikes(initialLikes, id);
  const [showReplies, setShowReplies] = useState(true);
  
  const isAuthor = currentUser?.id === author.id;
  const maxDepth = 3;
  
  const handleReplySubmit = async (content: string) => {
    if (onReply) {
      await onReply(id, content);
      setShowReplyForm(false);
    }
  };
  
  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };
  
  return (
    <div className={`comment-item ${isReply ? 'pl-6 border-l border-gray-100 mt-4' : 'mb-6'}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback>{author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <span className="font-medium text-sm">{author.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex items-center">
              <ReportContentButton
                contentId={id}
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
          
          <div className="text-sm">{content}</div>
          
          <div className="flex items-center gap-2 pt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 px-2 ${hasLiked ? 'text-blue-600' : 'text-muted-foreground'}`}
              onClick={handleLike}
              disabled={!isLoggedIn}
            >
              <ThumbsUp className={`h-4 w-4 mr-1 ${hasLiked ? 'fill-current text-blue-500' : ''}`} />
              {likes > 0 && likes}
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
            
            {replies && replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={toggleReplies}
              >
                {showReplies ? 'Hide Replies' : `Show Replies (${replies.length})`}
              </Button>
            )}
          </div>
          
          {showReplyForm && (
            <div className="mt-3">
              <ReplyForm
                parentId={id}
                onSubmit={handleReplySubmit}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
          
          {replies && replies.length > 0 && showReplies && (
            <div className="mt-4 space-y-4">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  {...reply}
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
