
import React from 'react';
import { Card } from '@/components/ui/card';
import CommentForm from './CommentForm';
import CommentList from './CommentList';
import CommentsHeader from './CommentsHeader';
import EmptyCommentsState from './EmptyCommentsState';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';

interface CommentsSectionProps {
  articleId: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ articleId }) => {
  const { isLoggedIn } = useAuth();
  const { 
    comments, 
    isLoading, 
    isSubmitting, 
    handleSubmitComment,
    handleSubmitReply
  } = useComments(articleId);

  return (
    <Card className="mt-8 pt-4 px-6 pb-6 bg-gray-50/50">
      <CommentsHeader commentCount={comments.length} />
      
      <CommentForm onSubmit={handleSubmitComment} isSubmitting={isSubmitting} />
      
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          <p>Loading comments...</p>
        </div>
      ) : comments.length > 0 ? (
        <CommentList 
          comments={comments} 
          isLoading={isLoading} 
          articleId={articleId}
          onReply={handleSubmitReply}
        />
      ) : (
        !isLoggedIn ? <EmptyCommentsState /> : (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )
      )}
    </Card>
  );
};

export default CommentsSection;
