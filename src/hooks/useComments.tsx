
import { useState, useEffect, useCallback } from 'react';
import { CommentProps } from '@/components/Comments/CommentItem';
import { useToast } from '@/components/ui/use-toast';
import { commentConvexService } from '@/services/convex/commentConvexService';
import { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useComments = (articleId: string) => {
  const [comments, setComments] = useState<CommentProps[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Fetch comments from Convex
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        logger.info(LogSource.CONTENT, 'Fetching comments for article', { articleId });
        const { comments: data } = await commentConvexService.getByArticle(articleId, 'published');
        const all = data || [];
        // Map to top-level and replies
        const byParent: Record<string, any[]> = {};
        for (const c of all) {
          if (c.parent_comment_id) {
            const pid = String(c.parent_comment_id);
            (byParent[pid] ||= []).push(c);
          }
        }
        const topLevel = all.filter((c: any) => !c.parent_comment_id);
        const formatted: CommentProps[] = topLevel.map((c: any) => ({
          id: String(c._id),
          content: c.content,
          createdAt: new Date(c.created_at),
          author: {
            name: c.profile?.display_name || 'Unknown',
            avatar: c.profile?.avatar_url || undefined,
            badges: c.profile?.role && c.profile.role !== 'reader' ? [c.profile.role] : [],
          },
          likes: c.like_count || 0,
          replies: (byParent[String(c._id)] || []).map((r: any) => ({
            id: String(r._id),
            content: r.content,
            createdAt: new Date(r.created_at),
            author: {
              name: r.profile?.display_name || 'Unknown',
              avatar: r.profile?.avatar_url || undefined,
              badges: r.profile?.role && r.profile.role !== 'reader' ? [r.profile.role] : [],
            },
            likes: r.like_count || 0,
            articleId,
          })),
          articleId,
        }));

        setComments(formatted);
        logger.info(LogSource.CONTENT, 'Comments loaded successfully', { count: formatted.length });
      } catch (error) {
        handleApiError(error, true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
    // No manual realtime subscription; Convex queries are reactive if used via hooks
    return () => { };
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
      logger.info(LogSource.CONTENT, 'Submitting comment for article', { articleId });

      const { data, error } = await commentConvexService.create({
        article_id: articleId as Id<'articles'> as any,
        user_id: currentUser.id as Id<'profiles'> as any,
        content,
        status: 'published',
      });
      if (error || !data) { handleApiError(error, true); return; }
      const newComment: CommentProps = {
        id: String(data._id),
        content,
        createdAt: new Date(),
        author: { name: currentUser.display_name || currentUser.username || 'You', avatar: currentUser.avatar_url || undefined, badges: [] },
        likes: 0,
        replies: [],
        articleId,
      };

      setComments(prevComments => [newComment, ...prevComments]);

      toast({
        title: 'Comment posted',
        description: 'Your comment has been posted successfully.'
      });

    } catch (error) {
      handleApiError(error, true);
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
      logger.info(LogSource.CONTENT, 'Submitting reply for article', { articleId, parentId });

      const { data, error } = await commentConvexService.create({
        article_id: articleId as any,
        user_id: currentUser.id as any,
        content,
        parent_comment_id: parentId as any,
        status: 'published',
      });
      if (error) { handleApiError(error, true); return false; }
      const newReply: CommentProps = {
        id: String(data?._id || Math.random()),
        content,
        createdAt: new Date(),
        author: { name: currentUser.display_name || currentUser.username || 'You', avatar: currentUser.avatar_url || undefined, badges: [] },
        likes: 0,
        articleId,
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
      handleApiError(error, true);
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
