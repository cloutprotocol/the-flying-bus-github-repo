import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getFlaggedComments } from '@/services/commentService';
import { useModeration } from '@/hooks/useModeration';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { withErrorHandling } from '@/utils/errorHandling';

export const useCommentModeration = () => {
  const [filter, setFilter] = useState('flagged');
  const [searchTerm, setSearchTerm] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { toast } = useToast();
  const { handleApprove, handleReject, processingIds } = useModeration();

  // Update filter handler to ensure UI and state are consistent
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  };

  // Ensure we reset the page when search term changes
  useEffect(() => {
    if (searchTerm) {
      setPage(1);
    }
  }, [searchTerm]);

  // Separate useEffect for clearing comments when filter changes
  useEffect(() => {
    setComments([]); // Clear comments when filter changes to avoid showing incorrect data
  }, [filter]);

  const fetchComments = useCallback(async (currentPage = 1) => {
    setLoading(true);
    
    try {
      const { data, error } = await withErrorHandling(
        () => getFlaggedComments(filter, searchTerm, currentPage, limit),
        {
          errorMessage: "Could not load comments for moderation",
          logSource: LogSource.MODERATION,
          showToast: true
        }
      );
      
      if (data) {
        const { comments: fetchedComments, count } = data;
        
        // If loading more pages, append to existing comments
        if (currentPage > 1) {
          setComments(prev => [...prev, ...fetchedComments]);
        } else {
          // Otherwise replace comments
          setComments(fetchedComments);
        }
        
        setTotalCount(count);
        logger.info(LogSource.MODERATION, 'Comments fetched successfully', { 
          count, 
          commentsFound: fetchedComments.length,
          filter
        });
      }
    } catch (err) {
      logger.error(LogSource.MODERATION, 'Error fetching comments', err);
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm, limit, toast]);

  useEffect(() => {
    fetchComments(page);
  }, [fetchComments, page]);

  const loadMoreComments = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const onApprove = useCallback(async (commentId: string) => {
    logger.info(LogSource.MODERATION, 'Approving comment', { commentId });
    await handleApprove(commentId, (id) => {
      // Remove the comment from the list after successful approval if not viewing "approved" filter
      if (filter !== 'approved') {
        setComments(prev => prev.filter(comment => comment.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
      }
      
      toast({
        title: "Comment Approved",
        description: "The comment has been published successfully",
      });
    });
  }, [handleApprove, toast, filter]);

  const onReject = useCallback(async (commentId: string) => {
    logger.info(LogSource.MODERATION, 'Rejecting comment', { commentId });
    await handleReject(commentId, undefined, (id) => {
      // Remove the comment from the list after successful rejection if not viewing "rejected" filter
      if (filter !== 'rejected') {
        setComments(prev => prev.filter(comment => comment.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
      }
      
      toast({
        title: "Comment Rejected",
        description: "The comment has been removed successfully",
      });
    });
  }, [handleReject, toast, filter]);

  return {
    filter,
    setFilter: handleFilterChange,
    searchTerm,
    setSearchTerm,
    comments,
    totalCount,
    loading,
    processingIds,
    onApprove,
    onReject,
    loadMoreComments,
    page,
    refreshComments: () => fetchComments(1)
  };
};

export default useCommentModeration;
