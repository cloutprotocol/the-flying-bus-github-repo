import { useState, useEffect, useCallback } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
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

      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      const res: any = await convex.query(api.comments.getFlagged, {
        filter,
        searchTerm,
        page: 1,
        limit: 100,
      });
      const items = (res?.comments || []).map((c: any) => ({
        id: String(c._id),
        content: c.content,
        created_at: c.created_at,
        article_id: String(c.article_id),
        user_id: String(c.user_id),
        status: c.status,
        profiles: c.profile ? { display_name: c.profile.display_name, avatar_url: c.profile.avatar_url } : undefined,
      }));
      console.log('Comments fetched successfully:', items.length);
      setComments(items);
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
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      await convex.mutation(api.comments.updateStatus, { id: commentId as any as Id<'comments'>, status: 'approved' });

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
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      await convex.mutation(api.comments.updateStatus, { id: commentId as any as Id<'comments'>, status: 'rejected' });

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
