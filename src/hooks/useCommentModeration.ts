
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getFlaggedComments } from '@/services/commentService';
import { useModeration } from '@/hooks/useModeration';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useCommentModeration = () => {
  const [filter, setFilter] = useState('flagged');
  const [searchTerm, setSearchTerm] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { handleApprove, handleReject, processingIds } = useModeration();

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        logger.info(LogSource.MODERATION, 'Fetching comments for moderation', { filter, searchTerm });
        const { comments, count, error } = await getFlaggedComments(filter, searchTerm);
        if (error) {
          logger.error(LogSource.MODERATION, 'Error fetching comments', { error });
          toast({
            title: "Error",
            description: "Could not load comments for moderation",
            variant: "destructive"
          });
        } else {
          setComments(comments);
          setTotalCount(count);
          logger.info(LogSource.MODERATION, 'Comments fetched successfully', { count });
        }
      } catch (err) {
        logger.error(LogSource.MODERATION, 'Exception fetching comments', err);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [filter, searchTerm, toast]);

  const onApprove = useCallback(async (commentId: string) => {
    logger.info(LogSource.MODERATION, 'Approving comment', { commentId });
    await handleApprove(commentId, (id) => {
      // Remove the comment from the list after successful approval
      setComments(prev => prev.filter(comment => comment.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    });
  }, [handleApprove]);

  const onReject = useCallback(async (commentId: string) => {
    logger.info(LogSource.MODERATION, 'Rejecting comment', { commentId });
    await handleReject(commentId, undefined, (id) => {
      // Remove the comment from the list after successful rejection
      setComments(prev => prev.filter(comment => comment.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    });
  }, [handleReject]);

  return {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    comments,
    totalCount,
    loading,
    processingIds,
    onApprove,
    onReject
  };
};

export default useCommentModeration;
