
import { useState, useEffect } from 'react';
import { CommentProps } from '@/components/Comments/CommentItem';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useComments = (articleId: string) => {
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch comments from Supabase
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            parent_id,
            profiles:user_id (
              display_name,
              username,
              avatar_url,
              role
            )
          `)
          .eq('article_id', articleId)
          .is('parent_id', null)
          .eq('status', 'published')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching comments:', error);
          return;
        }
        
        // Format comments to match CommentProps
        const formattedComments: CommentProps[] = await Promise.all(
          data.map(async (comment) => {
            // Fetch replies for this comment
            const { data: repliesData, error: repliesError } = await supabase
              .from('comments')
              .select(`
                id,
                content,
                created_at,
                user_id,
                profiles:user_id (
                  display_name,
                  username,
                  avatar_url,
                  role
                )
              `)
              .eq('parent_id', comment.id)
              .eq('status', 'published')
              .order('created_at', { ascending: true });
            
            if (repliesError) {
              console.error('Error fetching replies:', repliesError);
            }
            
            // Format replies
            const replies = repliesData ? repliesData.map(reply => ({
              id: reply.id,
              content: reply.content,
              createdAt: new Date(reply.created_at),
              author: {
                name: reply.profiles.display_name,
                avatar: reply.profiles.avatar_url || undefined,
                badges: reply.profiles.role !== 'reader' ? [reply.profiles.role] : []
              },
              likes: 0 // We'll implement this in a future update
            })) : [];
            
            // Return formatted comment with replies
            return {
              id: comment.id,
              content: comment.content,
              createdAt: new Date(comment.created_at),
              author: {
                name: comment.profiles.display_name,
                avatar: comment.profiles.avatar_url || undefined,
                badges: comment.profiles.role !== 'reader' ? [comment.profiles.role] : []
              },
              likes: 0, // We'll implement this in a future update
              replies
            };
          })
        );
        
        setComments(formattedComments);
      } catch (error) {
        console.error('Error processing comments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComments();
  }, [articleId]);

  const handleSubmitComment = async (content: string, currentUser: any) => {
    if (!currentUser) return;
    
    setIsSubmitting(true);
    
    try {
      // Insert the comment to Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert({
          article_id: articleId,
          user_id: currentUser.id,
          content,
          status: 'published'
        })
        .select('*, profiles:user_id (display_name, username, avatar_url, role)')
        .single();
      
      if (error) {
        console.error('Error submitting comment:', error);
        toast({
          title: 'Failed to post comment',
          description: 'There was an error posting your comment. Please try again.',
          variant: 'destructive'
        });
        return;
      }
      
      // Add the new comment to the state
      const newComment: CommentProps = {
        id: data.id,
        content: data.content,
        createdAt: new Date(data.created_at),
        author: {
          name: data.profiles.display_name,
          avatar: data.profiles.avatar_url || undefined,
          badges: data.profiles.role !== 'reader' ? [data.profiles.role] : []
        },
        likes: 0,
        replies: []
      };
      
      setComments([newComment, ...comments]);
      
      toast({
        title: 'Comment posted',
        description: 'Your comment has been posted successfully.'
      });
      
    } catch (error) {
      console.error('Error in comment submission:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    comments,
    isLoading,
    isSubmitting,
    handleSubmitComment
  };
};
