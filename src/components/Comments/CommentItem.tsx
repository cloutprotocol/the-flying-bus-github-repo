
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import ProfileLink from './ProfileLink';
import ReplyForm from './ReplyForm';
import { useCommentLikes } from '@/hooks/useCommentLikes';
import { useAuth } from '@/hooks/useAuth';
import CommentBadges from './CommentBadges';
import CommentActions from './CommentActions';
import CommentReplies from './CommentReplies';
import { useComments } from '@/hooks/useComments';

export interface CommentProps {
  id: string;
  author: {
    name: string;
    avatar?: string;
    badges?: string[];
  };
  content: string;
  createdAt: Date;
  likes: number;
  replies?: CommentProps[];
  articleId?: string;
}

const CommentItem: React.FC<CommentProps> = ({ 
  id, 
  author, 
  content, 
  createdAt, 
  likes: initialLikes, 
  replies = [],
  articleId
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [localReplies, setLocalReplies] = useState<CommentProps[]>(replies);
  const { isLoggedIn } = useAuth();
  const { likes, hasLiked, handleLike } = useCommentLikes(initialLikes, id);
  const { handleSubmitReply } = useComments(articleId || '');
  
  const handleReplyClick = () => {
    if (!isLoggedIn) return;
    
    setIsReplying(!isReplying);
    if (!showReplies && localReplies.length > 0) {
      setShowReplies(true);
    }
  };
  
  const handleReplySubmit = async (replyContent: string) => {
    if (!articleId) return;
    
    const success = await handleSubmitReply(replyContent, id);
    
    if (success) {
      setIsReplying(false);
      setShowReplies(true);
      
      // The parent useComments hook now handles updating the comment list
      // so we don't need to manually add the reply here
    }
  };

  return (
    <div className="py-4 border-b border-neutral-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <ProfileLink 
                name={author.name}
                avatar={author.avatar}
                className="font-medium text-sm"
              />
              
              <CommentBadges badges={author.badges} />
            </div>
            <span className="text-xs text-neutral-500">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-neutral-700 mb-3">{content}</p>
          
          <CommentActions 
            isLoggedIn={isLoggedIn}
            hasLiked={hasLiked}
            likes={likes}
            onLike={handleLike}
            onReply={handleReplyClick}
            showReplies={showReplies}
            toggleReplies={() => setShowReplies(!showReplies)}
            replyCount={localReplies.length}
          />
          
          {isReplying && (
            <div className="mt-3">
              <ReplyForm 
                parentId={id} 
                onSubmit={handleReplySubmit} 
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}
          
          <CommentReplies 
            replies={localReplies} 
            showReplies={showReplies} 
          />
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
