
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import ProfileLink from './ProfileLink';
import { CommentProps } from './CommentItem';

interface CommentRepliesProps {
  replies: CommentProps[];
  showReplies: boolean;
}

const CommentReplies: React.FC<CommentRepliesProps> = ({ replies, showReplies }) => {
  if (!showReplies || replies.length === 0) return null;
  
  return (
    <div className="mt-4 pl-4 border-l-2 border-neutral-100 space-y-3">
      {replies.map((reply) => (
        <div key={reply.id} className="py-2">
          <div className="flex justify-between items-center mb-1">
            <ProfileLink 
              name={reply.author.name}
              avatar={reply.author.avatar}
              className="font-medium text-sm"
            />
            <span className="text-xs text-neutral-500">
              {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-neutral-700">{reply.content}</p>
        </div>
      ))}
    </div>
  );
};

export default CommentReplies;
