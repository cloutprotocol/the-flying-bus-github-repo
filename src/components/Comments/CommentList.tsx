
import React from 'react';
import CommentItem from './CommentItem';
import { CommentProps } from './CommentItem';

interface CommentListProps {
  comments: CommentProps[];
  isLoading: boolean;
  articleId: string;
  onReply?: (commentId: string, content: string) => Promise<boolean>;
}

const CommentList: React.FC<CommentListProps> = ({ 
  comments, 
  isLoading, 
  articleId,
  onReply
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Loading comments...</p>
      </div>
    );
  }
  
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">No comments yet. Be the first to comment!</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 mt-6">
      {comments.map((comment) => (
        <CommentItem 
          key={comment.id} 
          {...comment}
          onReply={onReply}
        />
      ))}
    </div>
  );
};

export default CommentList;
