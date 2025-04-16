
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import ProfileLink from './ProfileLink';
import ReplyForm from './ReplyForm';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CommentBadges from './CommentBadges';
import CommentActions from './CommentActions';
import CommentReplies from './CommentReplies';

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
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [localReplies, setLocalReplies] = useState<CommentProps[]>(replies);
  const { toast } = useToast();
  const { isLoggedIn, currentUser } = useAuth();
  
  const handleLike = () => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like comments",
        variant: "default"
      });
      return;
    }
    
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
    } else {
      setLikes(prev => prev - 1);
      setHasLiked(false);
    }
    
    // In a future update, we'll persist the like to Supabase
  };
  
  const handleReplyClick = () => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to reply to comments",
        variant: "default"
      });
      return;
    }
    
    setIsReplying(!isReplying);
    if (!showReplies && localReplies.length > 0) {
      setShowReplies(true);
    }
  };
  
  const handleReplySubmit = async (replyContent: string) => {
    if (!currentUser || !articleId) return;
    
    try {
      console.log('Submitting reply for article:', articleId, 'parent:', id);
      
      // Insert the reply to Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert({
          article_id: articleId,
          user_id: currentUser.id,
          content: replyContent,
          parent_id: id,
          status: 'published'
        })
        .select('*, profiles:user_id (display_name, username, avatar_url, role)')
        .single();
      
      if (error) {
        console.error('Error submitting reply:', error);
        toast({
          title: 'Failed to post reply',
          description: 'There was an error posting your reply. Please try again.',
          variant: 'destructive'
        });
        return;
      }
      
      // Create the new reply object
      const newReply: CommentProps = {
        id: data.id,
        content: data.content,
        createdAt: new Date(data.created_at),
        author: {
          name: data.profiles.display_name,
          avatar: data.profiles.avatar_url || undefined,
          badges: data.profiles.role !== 'reader' ? [data.profiles.role] : []
        },
        likes: 0,
        articleId
      };
      
      // Add the new reply to the local state
      setLocalReplies([...localReplies, newReply]);
      setIsReplying(false);
      setShowReplies(true);
      
      toast({
        title: 'Reply posted',
        description: 'Your reply has been posted successfully.'
      });
      
    } catch (error) {
      console.error('Error in reply submission:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
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
