
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { DrawerAuth } from '@/components/ui/drawer-auth';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [comment, setComment] = useState('');
  const { isLoggedIn, currentUser } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (comment.trim() && !isSubmitting) {
      onSubmit(comment);
      setComment('');
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!currentUser) return "GU";
    return currentUser.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mb-2">
      <Avatar className="h-8 w-8 mt-1">
        {isLoggedIn && currentUser ? (
          <>
            <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
            <AvatarFallback className="bg-neutral-600 text-white text-xs">
              {getInitials()}
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="/avatar-placeholder.png" />
            <AvatarFallback className="bg-neutral-600 text-white text-xs">
              GU
            </AvatarFallback>
          </>
        )}
      </Avatar>
      
      <div className="flex-1 space-y-3">
        <Textarea
          placeholder={isLoggedIn ? "Share your thoughts..." : "Sign in to join the discussion"}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[80px] resize-none border-neutral-200 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 bg-white"
          disabled={!isLoggedIn || isSubmitting}
        />
        
        <div className="flex justify-end gap-2">
          {!isLoggedIn && (
            <DrawerAuth 
              triggerComponent={
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                >
                  Sign In
                </Button>
              }
              defaultTab="sign-in"
            />
          )}
          <Button 
            type="submit" 
            disabled={!comment.trim() || isSubmitting || !isLoggedIn}
            size="sm"
            className="bg-neutral-600 hover:bg-neutral-700"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
