
import React from 'react';
import ReviewComment, { ReviewCommentType } from './ReviewComment';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewsListProps {
  comments: ReviewCommentType[];
  onDeleteComment?: (commentId: string) => void;
  showPrivateComments?: boolean;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ 
  comments, 
  onDeleteComment,
  showPrivateComments = false
}) => {
  const { currentUser } = useAuth();

  // Filter comments based on visibility permissions
  const visibleComments = comments.filter(comment => 
    !comment.isPrivate || (comment.isPrivate && showPrivateComments)
  );

  // Sort by newest first
  const sortedComments = [...visibleComments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  if (sortedComments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No review comments yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedComments.map((comment, index) => (
        <React.Fragment key={comment.id}>
          <ReviewComment 
            comment={comment} 
            onDelete={onDeleteComment} 
            canDelete={currentUser?.id === comment.authorName || currentUser?.role === 'admin'}
          />
          {index < sortedComments.length - 1 && <Separator />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ReviewsList;
