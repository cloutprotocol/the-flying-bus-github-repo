
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

export interface ReviewCommentType {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date;
  isPrivate: boolean;
}

interface ReviewCommentProps {
  comment: ReviewCommentType;
  onDelete?: (commentId: string) => void;
  canDelete?: boolean;
}

const ReviewComment: React.FC<ReviewCommentProps> = ({ comment, onDelete, canDelete = false }) => {
  const { authorName, authorAvatar, content, createdAt, isPrivate } = comment;
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
  };

  return (
    <div className={`flex gap-3 p-3 rounded-lg ${isPrivate ? 'bg-amber-50' : 'bg-white border'}`}>
      <Avatar className="h-8 w-8">
        {authorAvatar ? (
          <AvatarImage src={authorAvatar} alt={authorName} />
        ) : (
          <AvatarFallback>
            {authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-medium text-sm">{authorName}</span>
            {isPrivate && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Internal Only
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>
        
        <p className="text-sm mt-1">{content}</p>
        
        {canDelete && (
          <div className="mt-2 flex justify-end">
            <button 
              className="text-xs text-red-600 hover:text-red-800" 
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewComment;
