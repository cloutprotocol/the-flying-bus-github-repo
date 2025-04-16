
import React, { useState, useEffect } from 'react';
import CommentItem, { CommentProps } from './CommentItem';
import CommentForm from './CommentForm';
import { Card } from '@/components/ui/card';
import { MessageCircle, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawerAuth } from '@/components/ui/drawer-auth';
import { addComment } from '@/data/comments';
import { useAuth } from '@/contexts/AuthContext';

interface CommentsSectionProps {
  articleId: string;
  comments: CommentProps[];
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ articleId, comments }) => {
  const [localComments, setLocalComments] = useState<CommentProps[]>(comments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoggedIn, currentUser } = useAuth();

  // Re-initialize comments when auth state changes
  useEffect(() => {
    setLocalComments(comments);
  }, [comments, isLoggedIn]);

  const handleSubmitComment = (content: string) => {
    if (!currentUser) return;
    
    setIsSubmitting(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const newComment: Omit<CommentProps, 'id'> = {
        author: {
          name: currentUser.displayName,
          avatar: currentUser.avatar,
          badges: currentUser.badges || []
        },
        content,
        createdAt: new Date(),
        likes: 0,
        replies: []
      };
      
      // Add comment to mock data
      const savedComment = addComment(articleId, newComment);
      setLocalComments([savedComment, ...localComments]);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <Card className="mt-8 pt-4 px-6 pb-6 bg-gray-50/50">
      <h3 className="text-xl font-semibold flex items-center gap-2 mb-6">
        <MessageCircle className="h-5 w-5 text-neutral-600" />
        Discussion ({localComments.length})
      </h3>
      
      <CommentForm onSubmit={handleSubmitComment} isSubmitting={isSubmitting} />
      
      {localComments.length > 0 ? (
        <div className="space-y-1 mt-6">
          {localComments.map((comment) => (
            <CommentItem key={comment.id} {...comment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No comments yet. Be the first to comment!</p>
          {!isLoggedIn && (
            <DrawerAuth 
              triggerComponent={
                <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Create an account to join the discussion
                </Button>
              }
              defaultTab="sign-up"
            />
          )}
        </div>
      )}
    </Card>
  );
};

export default CommentsSection;
