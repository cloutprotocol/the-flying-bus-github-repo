import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface SimpleComment {
  id: string;
  content: string;
  created_at: string;
  article_id: string;
  user_id: string;
  status: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

export function useSimpleCommentModeration() {
  const [comments, setComments] = useState<SimpleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState('flagged');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching comments with filter:', filter, 'search:', searchTerm);

      let query = supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          article_id,
          user_id,
          status,
          profiles!user_id(display_name, avatar_url)
        `);

      // Apply filters based on the selected filter type
      if (filter !== 'all') {
        if (filter === 'flagged') {
          query = query.eq('status', 'flagged');
        } else if (filter === 'pending') {
          query = query.eq('status', 'pending');
        } else if (filter === 'approved') {
          query = query.eq('status', 'published');
        } else if (filter === 'rejected') {
          query = query.eq('status', 'rejected');
        }
      }

      // Apply search if provided
      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Comment query error:', queryError);
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      console.log('Comments fetched successfully:', data?.length || 0);
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      toast({
        title: "Error",
        description: "Failed to load comments for moderation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const onApprove = useCallback(async (commentId: string) => {
    if (processingIds.includes(commentId)) return;

    setProcessingIds(prev => [...prev, commentId]);

    try {
      const { error } = await supabase
        .from('comments')
        .update({ status: 'published' })
        .eq('id', commentId);

      if (error) {
        throw new Error(`Failed to approve comment: ${error.message}`);
      }

      // Remove from list if not viewing approved filter
      if (filter !== 'approved') {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }

      toast({
        title: "Success",
        description: "Comment approved successfully",
      });
    } catch (err) {
      console.error('Error approving comment:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to approve comment",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  }, [filter, processingIds, toast]);

  const onReject = useCallback(async (commentId: string) => {
    if (processingIds.includes(commentId)) return;

    setProcessingIds(prev => [...prev, commentId]);

    try {
      const { error } = await supabase
        .from('comments')
        .update({ status: 'rejected' })
        .eq('id', commentId);

      if (error) {
        throw new Error(`Failed to reject comment: ${error.message}`);
      }

      // Remove from list if not viewing rejected filter
      if (filter !== 'rejected') {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }

      toast({
        title: "Success",
        description: "Comment rejected successfully",
      });
    } catch (err) {
      console.error('Error rejecting comment:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reject comment",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== commentId));
    }
  }, [filter, processingIds, toast]);

  const refreshComments = useCallback(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    comments,
    totalCount: comments.length,
    loading,
    error,
    processingIds,
    onApprove,
    onReject,
    loadMoreComments: () => {}, // Not needed for simple implementation
    refreshComments
  };
}