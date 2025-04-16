
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  approveComment, 
  rejectComment, 
  flagComment 
} from '@/services/commentService';
import { logModerationAction } from '@/services/moderationService';
import { useAuth } from '@/hooks/useAuth';

/**
 * Custom hook for moderator actions
 */
export const useModeration = () => {
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const moderatorId = currentUser?.id;
  
  /**
   * Handle moderator approval of content
   */
  const handleApprove = useCallback(async (
    commentId: string,
    onSuccess?: (commentId: string) => void
  ) => {
    if (!moderatorId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in as a moderator to perform this action",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingIds(prev => [...prev, commentId]);
    
    try {
      // First approve the comment
      const { success, error } = await approveComment(commentId);
      
      if (success) {
        // Log the moderation action
        await logModerationAction(
          commentId,
          'comment',
          'approve',
          moderatorId,
          'Comment approved by moderator'
        );
        
        toast({
          title: "Comment approved",
          description: "The comment has been published",
        });
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(commentId);
        }
      } else {
        console.error('Error approving comment:', error);
        toast({
          title: "Error",
          description: "There was a problem approving the comment",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Exception approving comment:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  }, [moderatorId, toast]);
  
  /**
   * Handle moderator rejection of content
   */
  const handleReject = useCallback(async (
    commentId: string,
    reason?: string,
    onSuccess?: (commentId: string) => void
  ) => {
    if (!moderatorId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in as a moderator to perform this action",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingIds(prev => [...prev, commentId]);
    
    try {
      // First reject the comment
      const { success, error } = await rejectComment(commentId);
      
      if (success) {
        // Log the moderation action
        await logModerationAction(
          commentId,
          'comment',
          'reject',
          moderatorId,
          reason || 'Comment rejected by moderator'
        );
        
        toast({
          title: "Comment rejected",
          description: "The comment has been removed",
        });
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(commentId);
        }
      } else {
        console.error('Error rejecting comment:', error);
        toast({
          title: "Error",
          description: "There was a problem rejecting the comment",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Exception rejecting comment:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  }, [moderatorId, toast]);
  
  /**
   * Handle flagging of content
   */
  const handleFlag = useCallback(async (
    commentId: string,
    reason: string,
    onSuccess?: (commentId: string) => void
  ) => {
    setProcessingIds(prev => [...prev, commentId]);
    
    try {
      // Flag the comment
      const { success, error } = await flagComment(commentId, reason);
      
      if (success) {
        // Log the action if moderator is flagging
        if (moderatorId) {
          await logModerationAction(
            commentId,
            'comment',
            'flag',
            moderatorId,
            reason
          );
        }
        
        toast({
          title: "Content flagged",
          description: "Thank you for helping keep our platform safe",
        });
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(commentId);
        }
      } else {
        console.error('Error flagging comment:', error);
        toast({
          title: "Error",
          description: "There was a problem flagging the content",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Exception flagging comment:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  }, [moderatorId, toast]);
  
  return {
    processingIds,
    handleApprove,
    handleReject,
    handleFlag
  };
};

export default useModeration;
