
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { handleApprove, handleReject, processingIds } = useModeration();
  
  // Ref to store if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Ref to store the fetch abortcontroller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Debounce timer ref for search
  const searchTimerRef = useRef<number | null>(null);
  
  useEffect(() => {
    return () => {
      // Set mounted flag to false on cleanup
      isMounted.current = false;
      
      // Cancel any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear any pending search timer
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // Update filter handler to ensure UI and state are consistent
  const handleFilterChange = (newFilter: string) => {
    // Cancel any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
    setComments([]); // Clear comments when filter changes
    setError(null); // Clear any previous errors
  };

  // Debounced search handler
  const handleSearchChange = useCallback((term: string) => {
    // Clear previous timer
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    
    // Set a new timer to update search after delay
    searchTimerRef.current = window.setTimeout(() => {
      setSearchTerm(term);
      setPage(1); // Reset to first page when search changes
      setComments([]); // Clear comments when search changes
      setError(null); // Clear any previous errors
    }, 500);
  }, []);

  const fetchComments = useCallback(async (currentPage = 1, shouldAppend = false) => {
    // If we're in the middle of fetching, cancel that request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await withErrorHandling(
        () => getFlaggedComments(filter, searchTerm, currentPage, limit),
        {
          errorMessage: "Could not load comments for moderation",
          logSource: LogSource.MODERATION,
          showToast: true
        }
      );
      
      // Check if component is still mounted before updating state
      if (!isMounted.current) return;
      
      if (data) {
        const { comments: fetchedComments, count } = data;
        
        // If loading more pages, append to existing comments
        if (shouldAppend && currentPage > 1) {
          setComments(prev => [...prev, ...fetchedComments]);
        } else {
          // Otherwise replace comments
          setComments(fetchedComments);
        }
        
        setTotalCount(count);
        
        // Use reduced logging level to avoid filling up storage
        logger.debug(LogSource.MODERATION, 'Comments fetched successfully', { 
          count, 
          commentsFound: fetchedComments.length,
          filter
        });
      }
      
      if (error && isMounted.current) {
        setError(error);
      }
    } finally {
      // Make sure we only update state if still mounted
      if (isMounted.current) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [filter, searchTerm, limit]);

  // Separate useEffect hooks for the three sources of refetch
  
  // 1. Filter changes
  useEffect(() => {
    fetchComments(1, false);
  }, [filter, fetchComments]);
  
  // 2. Search term changes
  useEffect(() => {
    if (searchTerm !== '') {
      fetchComments(1, false);
    }
  }, [searchTerm, fetchComments]);
  
  // 3. Page changes for pagination
  useEffect(() => {
    // Only fetch if this isn't the initial render for page 1
    if (page > 1) {
      fetchComments(page, true);
    }
  }, [page, fetchComments]);

  const loadMoreComments = useCallback(() => {
    if (!loading) {
      setPage(prev => prev + 1);
    }
  }, [loading]);

  const onApprove = useCallback(async (commentId: string) => {
    if (processingIds.includes(commentId)) {
      return; // Prevent duplicate processing
    }
    
    logger.debug(LogSource.MODERATION, 'Approving comment', { commentId });
    await handleApprove(commentId, (id) => {
      // Remove the comment from the list after successful approval if not viewing "approved" filter
      if (filter !== 'approved' && isMounted.current) {
        setComments(prev => prev.filter(comment => comment.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
      }
      
      toast({
        title: "Comment Approved",
        description: "The comment has been published successfully",
      });
    });
  }, [handleApprove, toast, filter, processingIds]);

  const onReject = useCallback(async (commentId: string) => {
    if (processingIds.includes(commentId)) {
      return; // Prevent duplicate processing
    }
    
    logger.debug(LogSource.MODERATION, 'Rejecting comment', { commentId });
    await handleReject(commentId, undefined, (id) => {
      // Remove the comment from the list after successful rejection if not viewing "rejected" filter
      if (filter !== 'rejected' && isMounted.current) {
        setComments(prev => prev.filter(comment => comment.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
      }
      
      toast({
        title: "Comment Rejected",
        description: "The comment has been removed successfully",
      });
    });
  }, [handleReject, toast, filter, processingIds]);

  const refreshComments = useCallback(() => {
    // Cancel any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setPage(1);
    setComments([]);
    fetchComments(1, false);
  }, [fetchComments]);

  return {
    filter,
    setFilter: handleFilterChange,
    searchTerm,
    setSearchTerm: handleSearchChange,
    comments,
    totalCount,
    loading,
    error,
    processingIds,
    onApprove,
    onReject,
    loadMoreComments,
    page,
    refreshComments
  };
};

export default useCommentModeration;
