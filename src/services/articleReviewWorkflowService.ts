/**
 * Article Review Workflow Service
 * 
 * Handles the complete article review workflow including status changes,
 * review history tracking, and notifications.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { checkArticleOwnership } from './articleOwnershipService';

export interface ArticleReview {
  id: string;
  article_id: string;
  reviewer_id: string;
  status: 'pending_review' | 'approved' | 'rejected';
  feedback?: string;
  created_at: string;
  reviewer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface ArticleReviewHistory {
  id: string;
  article_id: string;
  previous_status: string;
  new_status: string;
  reviewer_id: string;
  feedback?: string;
  created_at: string;
  reviewer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface ReviewWorkflowResult {
  success: boolean;
  error?: string;
  review?: ArticleReview;
}

/**
 * Get articles pending review for admin/moderator users
 */
export async function getArticlesPendingReview(
  page: number = 1,
  limit: number = 10
): Promise<{
  articles: any[];
  count: number;
  error?: string;
}> {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return {
        articles: [],
        count: 0,
        error: 'User not authenticated'
      };
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return {
        articles: [],
        count: 0,
        error: 'Failed to fetch user profile'
      };
    }

    // Only admin and moderator can review articles
    if (!['admin', 'moderator'].includes(profile.role)) {
      return {
        articles: [],
        count: 0,
        error: 'Insufficient permissions to review articles'
      };
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get articles with pending_review status
    const { data, error, count } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        content,
        status,
        created_at,
        updated_at,
        submitted_for_review_at,
        author_id,
        profiles!articles_author_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('status', 'pending_review')
      .order('submitted_for_review_at', { ascending: true }) // Oldest first
      .range(from, to);

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching articles pending review', error);
      return {
        articles: [],
        count: 0,
        error: 'Failed to fetch articles pending review'
      };
    }

    return {
      articles: data || [],
      count: count || 0
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception fetching articles pending review', error);
    return {
      articles: [],
      count: 0,
      error: 'Failed to fetch articles pending review'
    };
  }
}

/**
 * Approve an article
 */
export async function approveArticle(
  articleId: string,
  feedback?: string
): Promise<ReviewWorkflowResult> {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const reviewerId = session.user.id;

    // Check if user has permission to review
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', reviewerId)
      .single();

    if (profileError || !['admin', 'moderator'].includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions to approve articles'
      };
    }

    // Update article status to approved
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .eq('status', 'pending_review'); // Only update if currently pending review

    if (updateError) {
      logger.error(LogSource.ARTICLE, 'Error approving article', updateError);
      return {
        success: false,
        error: 'Failed to approve article'
      };
    }

    // Create review record
    const reviewData = {
      article_id: articleId,
      reviewer_id: reviewerId,
      status: 'approved' as const,
      feedback: feedback || null,
      created_at: new Date().toISOString()
    };

    const { data: review, error: reviewError } = await supabase
      .from('article_reviews')
      .insert(reviewData)
      .select(`
        *,
        profiles!article_reviews_reviewer_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (reviewError) {
      logger.error(LogSource.ARTICLE, 'Error creating review record', reviewError);
      // Don't fail the whole operation if review record creation fails
    }

    logger.info(LogSource.ARTICLE, `Article ${articleId} approved by ${reviewerId}`);

    return {
      success: true,
      review: review ? {
        id: review.id,
        article_id: review.article_id,
        reviewer_id: review.reviewer_id,
        status: review.status,
        feedback: review.feedback,
        created_at: review.created_at,
        reviewer: review.profiles ? {
          id: review.profiles.id,
          display_name: review.profiles.display_name,
          avatar_url: review.profiles.avatar_url
        } : undefined
      } : undefined
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception approving article', error);
    return {
      success: false,
      error: 'Failed to approve article'
    };
  }
}

/**
 * Reject an article
 */
export async function rejectArticle(
  articleId: string,
  feedback: string
): Promise<ReviewWorkflowResult> {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const reviewerId = session.user.id;

    // Check if user has permission to review
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', reviewerId)
      .single();

    if (profileError || !['admin', 'moderator'].includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions to reject articles'
      };
    }

    // Update article status to rejected
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .eq('status', 'pending_review'); // Only update if currently pending review

    if (updateError) {
      logger.error(LogSource.ARTICLE, 'Error rejecting article', updateError);
      return {
        success: false,
        error: 'Failed to reject article'
      };
    }

    // Create review record
    const reviewData = {
      article_id: articleId,
      reviewer_id: reviewerId,
      status: 'rejected' as const,
      feedback: feedback,
      created_at: new Date().toISOString()
    };

    const { data: review, error: reviewError } = await supabase
      .from('article_reviews')
      .insert(reviewData)
      .select(`
        *,
        profiles!article_reviews_reviewer_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (reviewError) {
      logger.error(LogSource.ARTICLE, 'Error creating review record', reviewError);
      // Don't fail the whole operation if review record creation fails
    }

    logger.info(LogSource.ARTICLE, `Article ${articleId} rejected by ${reviewerId}`);

    return {
      success: true,
      review: review ? {
        id: review.id,
        article_id: review.article_id,
        reviewer_id: review.reviewer_id,
        status: review.status,
        feedback: review.feedback,
        created_at: review.created_at,
        reviewer: review.profiles ? {
          id: review.profiles.id,
          display_name: review.profiles.display_name,
          avatar_url: review.profiles.avatar_url
        } : undefined
      } : undefined
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception rejecting article', error);
    return {
      success: false,
      error: 'Failed to reject article'
    };
  }
}

/**
 * Get review history for an article
 */
export async function getArticleReviewHistory(
  articleId: string
): Promise<{
  reviews: ArticleReview[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('article_reviews')
      .select(`
        *,
        profiles!article_reviews_reviewer_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching article review history', error);
      return {
        reviews: [],
        error: 'Failed to fetch review history'
      };
    }

    const reviews: ArticleReview[] = (data || []).map(review => ({
      id: review.id,
      article_id: review.article_id,
      reviewer_id: review.reviewer_id,
      status: review.status,
      feedback: review.feedback,
      created_at: review.created_at,
      reviewer: review.profiles ? {
        id: review.profiles.id,
        display_name: review.profiles.display_name,
        avatar_url: review.profiles.avatar_url
      } : undefined
    }));

    return { reviews };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception fetching article review history', error);
    return {
      reviews: [],
      error: 'Failed to fetch review history'
    };
  }
}

/**
 * Publish an approved article
 */
export async function publishArticle(
  articleId: string
): Promise<ReviewWorkflowResult> {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const userId = session.user.id;

    // Check if user has permission to publish
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !['admin', 'moderator'].includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions to publish articles'
      };
    }

    // Update article status to published
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .eq('status', 'approved'); // Only publish approved articles

    if (updateError) {
      logger.error(LogSource.ARTICLE, 'Error publishing article', updateError);
      return {
        success: false,
        error: 'Failed to publish article'
      };
    }

    logger.info(LogSource.ARTICLE, `Article ${articleId} published by ${userId}`);

    return { success: true };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception publishing article', error);
    return {
      success: false,
      error: 'Failed to publish article'
    };
  }
}