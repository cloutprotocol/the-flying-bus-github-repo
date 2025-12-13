
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

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
        // Convex does not store likes per-user query exposed; approximate by checking counts and keep local state on click
        // For now just set false initially; it will update on click
        setHasLiked(false);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    // Get the current like count for this comment
    const fetchLikeCount = async () => {
      try {
        const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
        const comment: any = await convex.query(api.comments.getById, { commentId: commentId as any });
        setLikes(comment?.like_count || 0);
      } catch (error) {
        console.error('Error fetching like count:', error);
      }
    };
    
    checkExistingLike();
    fetchLikeCount();
    
    return () => {};
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
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      if (!hasLiked) {
        await convex.mutation(api.comments.incrementLikeCount, { id: commentId as any });
        setHasLiked(true);
        setLikes(prev => prev + 1);
      } else {
        await convex.mutation(api.comments.decrementLikeCount, { id: commentId as any });
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
