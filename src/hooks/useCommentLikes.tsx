
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useCommentLikes = (initialLikes: number = 0, commentId: string) => {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const { toast } = useToast();
  const { isLoggedIn, currentUser } = useAuth();

  // Check if the user has already liked this comment when component mounts
  useEffect(() => {
    const checkExistingLike = async () => {
      if (!isLoggedIn || !currentUser) return;
      
      try {
        const { data, error } = await supabase
          .from('comment_likes')
          .select('user_id')
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id)
          .maybeSingle();
          
        if (error) {
          console.error('Error checking like status:', error);
          return;
        }
        
        setHasLiked(!!data);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    // Get the current like count for this comment
    const fetchLikeCount = async () => {
      try {
        const { count, error } = await supabase
          .from('comment_likes')
          .select('user_id', { count: 'exact', head: true })
          .eq('comment_id', commentId);
          
        if (error) {
          console.error('Error fetching like count:', error);
          return;
        }
        
        setLikes(count || 0);
      } catch (error) {
        console.error('Error fetching like count:', error);
      }
    };
    
    checkExistingLike();
    fetchLikeCount();
    
    // Set up realtime subscription for likes
    const likesChannel = supabase
      .channel('comment_likes_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'comment_likes',
          filter: `comment_id=eq.${commentId}` 
        }, 
        async () => {
          // Reload the like count when changes occur
          const { count, error } = await supabase
            .from('comment_likes')
            .select('user_id', { count: 'exact', head: true })
            .eq('comment_id', commentId);
            
          if (error) {
            console.error('Error updating like count:', error);
            return;
          }
          
          setLikes(count || 0);
        }
      )
      .subscribe();
      
    // Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [commentId, isLoggedIn, currentUser]);
  
  const handleLike = useCallback(async () => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like comments",
        variant: "default"
      });
      return;
    }
    
    if (!currentUser) return;
    
    try {
      if (!hasLiked) {
        // Add like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: currentUser.id
          });
          
        if (error) {
          if (error.code === '23505') { // Unique violation
            console.log('Already liked this comment');
            return;
          }
          console.error('Error liking comment:', error);
          toast({
            title: "Error",
            description: "Could not like the comment. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Optimistically update the UI
        setHasLiked(true);
        setLikes(prev => prev + 1);
      } else {
        // Remove like
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .match({
            comment_id: commentId,
            user_id: currentUser.id
          });
          
        if (error) {
          console.error('Error unliking comment:', error);
          toast({
            title: "Error",
            description: "Could not unlike the comment. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Optimistically update the UI
        setHasLiked(false);
        setLikes(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  }, [commentId, hasLiked, isLoggedIn, currentUser, toast]);
  
  return {
    likes,
    hasLiked,
    handleLike
  };
};
