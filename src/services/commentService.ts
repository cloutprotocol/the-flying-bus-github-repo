
import { supabase } from '@/integrations/supabase/client';
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
    logger.info(LogSource.DATABASE, 'Fetching flagged comments', { filter, page });
    
    // Start building the query to get comments
    let query = supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        article_id,
        user_id,
        status,
        profiles!user_id(display_name, avatar_url),
        flagged_comments:flagged_content(
          id,
          reason,
          reporter_id,
          status,
          created_at
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (filter !== 'all') {
      if (filter === 'flagged') {
        // Get comments that have a 'flagged' status
        query = query.eq('status', 'flagged');
      } else if (filter === 'reported') {
        // Get comments that have been reported by users
        query = query
          .eq('status', 'flagged')
          .not('flagged_comments.reporter_id', 'is', null);
      } else {
        // Filter by comment status
        query = query.eq('status', filter);
      }
    }
    
    // Apply search if provided
    if (searchTerm) {
      query = query.ilike('content', `%${searchTerm}%`);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching flagged comments', { error });
      throw error;
    }
    
    // Transform the data for the UI
    const comments = data?.map((comment: CommentWithFlagged) => {
      // Get the flagged_content associated with this comment
      const flaggedContentArray = Array.isArray(comment.flagged_comments) 
        ? comment.flagged_comments 
        : comment.flagged_comments ? [comment.flagged_comments] : [];
      
      const flaggedContent = flaggedContentArray.length > 0 ? flaggedContentArray[0] : {} as FlaggedContent;
      
      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.user_id,
          name: comment.profiles?.display_name || 'Unknown User',
          avatar: comment.profiles?.avatar_url || '',
        },
        articleId: comment.article_id,
        articleTitle: 'Article Title', // We would need to fetch this separately or include in the query
        createdAt: new Date(comment.created_at),
        status: comment.status || 'pending',
        flagReason: flaggedContent.reason || '',
        reportedBy: flaggedContent.reporter_id ? 'User' : 'System',
        reportedAt: flaggedContent.created_at ? new Date(flaggedContent.created_at) : null,
      };
    }) || [];
    
    logger.info(LogSource.DATABASE, 'Flagged comments fetched successfully', { 
      count, 
      filter
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
    logger.info(LogSource.DATABASE, 'Approving comment', { commentId });
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const moderatorId = session?.user?.id;
    
    if (!moderatorId) {
      return { success: false, error: new Error('Authentication required') };
    }
    
    // Update comment status to published
    const { error } = await supabase
      .from('comments')
      .update({ status: 'published' })
      .eq('id', commentId);
      
    if (error) {
      logger.error(LogSource.DATABASE, 'Error approving comment', { error, commentId });
      return { success: false, error };
    }
    
    // Update any flagged content records for this comment
    const { error: flagError } = await supabase
      .from('flagged_content')
      .update({ 
        status: 'resolved',
        reviewer_id: moderatorId,
        reviewed_at: new Date().toISOString()
      })
      .eq('content_id', commentId)
      .eq('content_type', 'comment');
      
    if (flagError) {
      logger.warn(LogSource.DATABASE, 'Error updating flagged content record', { error: flagError, commentId });
      // Don't fail the operation for this secondary update
    }
    
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
    logger.info(LogSource.DATABASE, 'Rejecting comment', { commentId });
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const moderatorId = session?.user?.id;
    
    if (!moderatorId) {
      return { success: false, error: new Error('Authentication required') };
    }
    
    // Update comment status to rejected
    const { error } = await supabase
      .from('comments')
      .update({ status: 'rejected' })
      .eq('id', commentId);
      
    if (error) {
      logger.error(LogSource.DATABASE, 'Error rejecting comment', { error, commentId });
      return { success: false, error };
    }
    
    // Update any flagged content records for this comment
    const { error: flagError } = await supabase
      .from('flagged_content')
      .update({ 
        status: 'resolved',
        reviewer_id: moderatorId,
        reviewed_at: new Date().toISOString()
      })
      .eq('content_id', commentId)
      .eq('content_type', 'comment');
      
    if (flagError) {
      logger.warn(LogSource.DATABASE, 'Error updating flagged content record', { error: flagError, commentId });
      // Don't fail the operation for this secondary update
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
    logger.info(LogSource.DATABASE, 'Flagging comment', { commentId, reason });
    
    // Get current user if logged in
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // Insert flagged content record
    const { error } = await supabase
      .from('flagged_content')
      .insert({
        content_id: commentId,
        content_type: 'comment',
        reason,
        reporter_id: userId || null,
        status: 'pending'
      });
      
    if (error) {
      logger.error(LogSource.DATABASE, 'Error flagging comment', { error, commentId });
      return { success: false, error };
    }
    
    // Update comment status to flagged
    const { error: updateError } = await supabase
      .from('comments')
      .update({ status: 'flagged' })
      .eq('id', commentId);
      
    if (updateError) {
      logger.warn(LogSource.DATABASE, 'Error updating comment status', { error: updateError, commentId });
      // Don't fail if just the status update fails
    }
    
    logger.info(LogSource.DATABASE, 'Comment flagged successfully', { commentId });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception flagging comment', { error: e, commentId });
    return { success: false, error: e };
  }
};
