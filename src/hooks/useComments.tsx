
import { useState, useEffect, useCallback } from 'react';
import { CommentProps } from '@/components/Comments/CommentItem';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useComments = (articleId: string) => {
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

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
              likes: 0, // Will be updated with real counts in a future step
              articleId // Add article ID to replies too
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
              likes: 0, // Will be updated with real counts in a future step
              replies,
              articleId
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

    // Set up realtime subscription for new comments
    const commentsChannel = supabase
      .channel('public:comments')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments',
          filter: `article_id=eq.${articleId}` 
        }, 
        async (payload) => {
          console.log('New comment received:', payload);
          
          // Only process top-level comments here
          if (payload.new.parent_id === null) {
            // Fetch the complete comment data with author profile
            const { data, error } = await supabase
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
              .eq('id', payload.new.id)
              .single();
              
            if (error) {
              console.error('Error fetching new comment details:', error);
              return;
            }
            
            // Format the new comment
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
              replies: [],
              articleId
            };
            
            // Add the new comment to the state (only if it's not from the current user)
            if (currentUser?.id !== payload.new.user_id) {
              setComments(prevComments => [newComment, ...prevComments]);
            }
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `parent_id=is.not.null`
        },
        async (payload) => {
          console.log('New reply received:', payload);
          
          // Check if this reply belongs to a comment in this article
          if (payload.new.article_id === articleId) {
            // Fetch the complete reply data with author profile
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
              .eq('id', payload.new.id)
              .single();
              
            if (error) {
              console.error('Error fetching new reply details:', error);
              return;
            }
            
            // Format the new reply
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
            
            // Add the new reply to its parent comment (only if it's not from the current user)
            if (currentUser?.id !== payload.new.user_id) {
              setComments(prevComments => 
                prevComments.map(comment => 
                  comment.id === payload.new.parent_id 
                    ? { 
                        ...comment, 
                        replies: [...(comment.replies || []), newReply] 
                      } 
                    : comment
                )
              );
            }
          }
        }
      )
      .subscribe();
      
    // Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [articleId, currentUser?.id]);

  const handleSubmitComment = useCallback(async (content: string) => {
    if (!currentUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to post a comment',
        variant: 'default'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Submitting comment for article:', articleId);
      
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
        replies: [],
        articleId
      };
      
      setComments(prevComments => [newComment, ...prevComments]);
      
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
  }, [articleId, currentUser, toast]);

  const handleSubmitReply = useCallback(async (content: string, parentId: string) => {
    if (!currentUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to reply to comments',
        variant: 'default'
      });
      return false;
    }
    
    try {
      console.log('Submitting reply for article:', articleId, 'parent:', parentId);
      
      // Insert the reply to Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert({
          article_id: articleId,
          user_id: currentUser.id,
          content: content,
          parent_id: parentId,
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
        return false;
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
      
      // Add the new reply to the parent comment's replies array
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === parentId 
            ? { 
                ...comment, 
                replies: [...(comment.replies || []), newReply] 
              } 
            : comment
        )
      );
      
      toast({
        title: 'Reply posted',
        description: 'Your reply has been posted successfully.'
      });
      
      return true;
    } catch (error) {
      console.error('Error in reply submission:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  }, [articleId, currentUser, toast]);

  return {
    comments,
    isLoading,
    isSubmitting,
    handleSubmitComment,
    handleSubmitReply
  };
};
