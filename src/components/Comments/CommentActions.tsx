
import React from 'react';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { DrawerAuth } from '@/components/ui/drawer-auth';

interface CommentActionsProps {
  isLoggedIn: boolean;
  hasLiked: boolean;
  likes: number;
  onLike: () => void;
  onReply: () => void;
  showReplies: boolean;
  toggleReplies: () => void;
  replyCount: number;
}

const CommentActions: React.FC<CommentActionsProps> = ({
  isLoggedIn,
  hasLiked,
  likes,
  onLike,
  onReply,
  showReplies,
  toggleReplies,
  replyCount
}) => {
  return (
    <div className="flex gap-4 mt-2">
      {isLoggedIn ? (
        <button 
          className={`text-xs ${hasLiked ? 'text-blue-600' : 'text-neutral-500'} hover:text-blue-600 transition-colors flex items-center gap-1`}
          onClick={onLike}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${hasLiked ? 'fill-blue-600' : ''}`} />
          {likes} {likes === 1 ? 'Like' : 'Likes'}
        </button>
      ) : (
        <DrawerAuth 
          triggerComponent={
            <button className="text-xs text-neutral-500 hover:text-blue-600 transition-colors flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              {likes} {likes === 1 ? 'Like' : 'Likes'}
            </button>
          }
          defaultTab="sign-in"
        />
      )}
      
      {isLoggedIn ? (
        <button 
          className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-1"
          onClick={onReply}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Reply
        </button>
      ) : (
        <DrawerAuth 
          triggerComponent={
            <button className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Reply
            </button>
          }
          defaultTab="sign-in"
        />
      )}
      
      {replyCount > 0 && (
        <button 
          className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
          onClick={toggleReplies}
        >
          {showReplies ? 'Hide Replies' : `Show Replies (${replyCount})`}
        </button>
      )}
    </div>
  );
};

export default CommentActions;
