
import { commentConvexService } from '@/services/convex/commentConvexService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Define interfaces for better type safety
interface FlaggedContent {
  id: string;
  reason: string;
  reporter_id: string | null;
  status: string;
  created_at: string;
}

interface CommentWithFlagged {
  id: string;
  content: string;
  created_at: string;
  article_id: string;
  user_id: string;
  status: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  flagged_comments: FlaggedContent[] | FlaggedContent | null;
}

/**
 * Fetch comments that need moderation
 */
export const getFlaggedComments = async (
  filter = 'flagged',
  searchTerm = '',
  page = 1,
  limit = 10
): Promise<{ comments: any[]; count: number; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching flagged comments from Convex', { filter, page });

    const { comments: data, count, error } = await commentConvexService.getFlagged(filter, searchTerm, page, limit);

    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching flagged comments', { error });
      return { comments: [], count: 0, error };
    }

    // Transform the data for the UI
    const comments = data?.map((comment: any) => {
      return {
        id: comment._id,
        content: comment.content,
        author: {
          id: comment.user_id,
          name: comment.profile?.display_name || 'Unknown User',
          avatar: comment.profile?.avatar_url || '',
        },
        articleId: comment.article_id,
        articleTitle: 'Article Title', // We would need to fetch this separately or include in the query
        createdAt: new Date(comment.created_at),
        status: comment.status || 'pending',
        flagReason: 'Flagged for review', // Simplified for now
        reportedBy: 'System',
        reportedAt: new Date(comment.created_at),
      };
    }) || [];

    logger.info(LogSource.DATABASE, 'Flagged comments fetched successfully', {
      count,
      filter,
      commentsCount: comments.length
    });

    return { comments, count: count || 0, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching flagged comments', e);
    return { comments: [], count: 0, error: e };
  }
};

/**
 * Approve a comment
 */
export const approveComment = async (commentId: string): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Approving comment via Convex', { commentId });

    // Update comment status to published (Convex uses 'published' or 'approved'?)
    // Using 'published' to match existing logic, ensure Convex backend validates this if needed.
    const { success, error } = await commentConvexService.updateStatus(commentId, 'published');

    if (error) {
      logger.error(LogSource.DATABASE, 'Error approving comment', { error, commentId });
      return { success: false, error };
    }

    // flagged_content update skipped as we are migrating away from it or it's handled implicitly

    logger.info(LogSource.DATABASE, 'Comment approved successfully', { commentId });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception approving comment', { error: e, commentId });
    return { success: false, error: e };
  }
};

/**
 * Reject a comment
 */
export const rejectComment = async (commentId: string): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Rejecting comment via Convex', { commentId });

    // Update comment status to rejected
    const { success, error } = await commentConvexService.updateStatus(commentId, 'rejected');

    if (error) {
      logger.error(LogSource.DATABASE, 'Error rejecting comment', { error, commentId });
      return { success: false, error };
    }

    logger.info(LogSource.DATABASE, 'Comment rejected successfully', { commentId });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception rejecting comment', { error: e, commentId });
    return { success: false, error: e };
  }
};

/**
 * Flag a comment
 */
export const flagComment = async (
  commentId: string,
  reason: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Flagging comment via Convex', { commentId, reason });

    // In Convex migration, we are simply updating status for now. 
    // If we need to store reasons, we'd need a separate table or field.
    // For MVP, updating status to 'flagged' is the priority.

    const { success, error } = await commentConvexService.updateStatus(commentId, 'flagged');

    if (error) {
      logger.error(LogSource.DATABASE, 'Error flagging comment', { error, commentId });
      return { success: false, error };
    }

    logger.info(LogSource.DATABASE, 'Comment flagged successfully', { commentId });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception flagging comment', { error: e, commentId });
    return { success: false, error: e };
  }
};
