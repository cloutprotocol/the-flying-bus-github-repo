import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, Award, MessageSquare } from 'lucide-react';
import ProfileLink from './ProfileLink';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import ReplyForm from './ReplyForm';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DrawerAuth } from '@/components/ui/drawer-auth';
import { supabase } from '@/integrations/supabase/client';

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
              
              {author.badges && author.badges.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Reader Badges:</p>
                        <div className="flex flex-wrap gap-1">
                          {author.badges.map((badge, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-xs text-neutral-500">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-neutral-700 mb-3">{content}</p>
          
          <div className="flex gap-4 mt-2">
            {isLoggedIn ? (
              <button 
                className={`text-xs ${hasLiked ? 'text-blue-600' : 'text-neutral-500'} hover:text-blue-600 transition-colors flex items-center gap-1`}
                onClick={handleLike}
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
                onClick={handleReplyClick}
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
            
            {localReplies.length > 0 && (
              <button 
                className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? 'Hide Replies' : `Show Replies (${localReplies.length})`}
              </button>
            )}
          </div>
          
          {isReplying && (
            <div className="mt-3">
              <ReplyForm 
                parentId={id} 
                onSubmit={handleReplySubmit} 
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}
          
          {showReplies && localReplies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-neutral-100 space-y-3">
              {localReplies.map((reply) => (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
