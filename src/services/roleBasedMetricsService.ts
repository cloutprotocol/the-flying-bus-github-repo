/**
 * Role-based metrics service
 * Provides role-specific metric calculations for the dashboard
 */

import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';
import { getUserRole } from '@/utils/roleBasedAccess';
import { DashboardMetrics } from './dashboardConfigService';

/**
 * Calculate metrics based on user role
 */
export async function calculateRoleBasedMetrics(user: ReaderProfile | null): Promise<DashboardMetrics> {
  const userRole = getUserRole(user);
  
  switch (userRole) {
    case 'admin':
      return calculateAdminMetrics(user);
    case 'moderator':
      return calculateModeratorMetrics(user);
    case 'author':
      return calculateAuthorMetrics(user);
    default:
      return {};
  }
}

/**
 * Calculate admin-specific metrics
 */
async function calculateAdminMetrics(user: ReaderProfile | null): Promise<DashboardMetrics> {
  try {
    const [
      articlesResult,
      usersResult,
      commentsResult,
      invitationsResult
    ] = await Promise.allSettled([
      supabase.from('articles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      // Note: invitation_tokens table might not exist, so we'll handle this gracefully
      supabase.from('invitation_tokens').select('*', { count: 'exact', head: true })
    ]);

    // Calculate pending reviews (articles with status 'pending_review' if such column exists)
    let pendingReviews = 0;
    try {
      const pendingResult = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');
      
      if (pendingResult.data !== null) {
        pendingReviews = pendingResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch pending reviews, status column may not exist:', error);
    }

    // Calculate pending comments (comments with status 'pending' if such column exists)
    let pendingComments = 0;
    try {
      const pendingCommentsResult = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (pendingCommentsResult.data !== null) {
        pendingComments = pendingCommentsResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch pending comments, status column may not exist:', error);
    }

    // Calculate pending invitations
    let pendingInvitations = 0;
    if (invitationsResult.status === 'fulfilled' && invitationsResult.value.data !== null) {
      try {
        const pendingInvitationsResult = await supabase
          .from('invitation_tokens')
          .select('*', { count: 'exact', head: true })
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString());
        
        if (pendingInvitationsResult.data !== null) {
          pendingInvitations = pendingInvitationsResult.count || 0;
        }
      } catch (error) {
        console.warn('Could not fetch pending invitations:', error);
      }
    }

    return {
      totalArticles: articlesResult.status === 'fulfilled' ? (articlesResult.value.count || 0) : 0,
      totalUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
      commentCount: commentsResult.status === 'fulfilled' ? (commentsResult.value.count || 0) : 0,
      pendingReviews,
      pendingComments,
      pendingInvitations,
      systemHealth: 'good' // This could be calculated based on various system metrics
    };
  } catch (error) {
    console.error('Error calculating admin metrics:', error);
    return {
      totalArticles: 0,
      totalUsers: 0,
      commentCount: 0,
      pendingReviews: 0,
      pendingComments: 0,
      pendingInvitations: 0,
      systemHealth: 'error'
    };
  }
}

/**
 * Calculate moderator-specific metrics
 */
async function calculateModeratorMetrics(user: ReaderProfile | null): Promise<DashboardMetrics> {
  try {
    const [
      articlesResult,
      commentsResult
    ] = await Promise.allSettled([
      supabase.from('articles').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true })
    ]);

    // Calculate pending reviews
    let pendingReviews = 0;
    try {
      const pendingResult = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');
      
      if (pendingResult.data !== null) {
        pendingReviews = pendingResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch pending reviews:', error);
    }

    // Calculate pending comments
    let pendingComments = 0;
    try {
      const pendingCommentsResult = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (pendingCommentsResult.data !== null) {
        pendingComments = pendingCommentsResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch pending comments:', error);
    }

    // Calculate categories count
    let categoriesCount = 0;
    try {
      const categoriesResult = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });
      
      if (categoriesResult.data !== null) {
        categoriesCount = categoriesResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch categories count:', error);
    }

    return {
      totalArticles: articlesResult.status === 'fulfilled' ? (articlesResult.value.count || 0) : 0,
      commentCount: commentsResult.status === 'fulfilled' ? (commentsResult.value.count || 0) : 0,
      pendingReviews,
      pendingComments,
      categoriesCount
    };
  } catch (error) {
    console.error('Error calculating moderator metrics:', error);
    return {
      totalArticles: 0,
      commentCount: 0,
      pendingReviews: 0,
      pendingComments: 0,
      categoriesCount: 0
    };
  }
}

/**
 * Calculate author-specific metrics
 */
async function calculateAuthorMetrics(user: ReaderProfile | null): Promise<DashboardMetrics> {
  if (!user) {
    return {
      myArticles: 0,
      myArticleViews: 0,
      myComments: 0,
      articlesInReview: 0,
      articlesPublished: 0
    };
  }

  try {
    // Get articles created by this author
    const myArticlesResult = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id);

    const myArticles = myArticlesResult.count || 0;

    // Calculate articles in review
    let articlesInReview = 0;
    try {
      const inReviewResult = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .eq('status', 'pending_review');
      
      if (inReviewResult.data !== null) {
        articlesInReview = inReviewResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch articles in review:', error);
    }

    // Calculate published articles
    let articlesPublished = 0;
    try {
      const publishedResult = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .eq('status', 'published');
      
      if (publishedResult.data !== null) {
        articlesPublished = publishedResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch published articles:', error);
      // Fallback: assume all articles are published if no status column
      articlesPublished = myArticles;
    }

    // Calculate views on author's articles
    let myArticleViews = 0;
    try {
      const viewsResult = await supabase
        .from('article_views')
        .select('views', { count: 'exact' })
        .in('article_id', 
          await supabase
            .from('articles')
            .select('id')
            .eq('author_id', user.id)
            .then(result => result.data?.map(article => article.id) || [])
        );
      
      if (viewsResult.data) {
        myArticleViews = viewsResult.data.reduce((total, view) => total + (view.views || 0), 0);
      }
    } catch (error) {
      console.warn('Could not fetch article views:', error);
    }

    // Calculate comments on author's articles
    let myComments = 0;
    try {
      const authorArticleIds = await supabase
        .from('articles')
        .select('id')
        .eq('author_id', user.id);

      if (authorArticleIds.data && authorArticleIds.data.length > 0) {
        const commentsResult = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('article_id', authorArticleIds.data.map(article => article.id));
        
        myComments = commentsResult.count || 0;
      }
    } catch (error) {
      console.warn('Could not fetch comments on author articles:', error);
    }

    return {
      myArticles,
      myArticleViews,
      myComments,
      articlesInReview,
      articlesPublished
    };
  } catch (error) {
    console.error('Error calculating author metrics:', error);
    return {
      myArticles: 0,
      myArticleViews: 0,
      myComments: 0,
      articlesInReview: 0,
      articlesPublished: 0
    };
  }
}

/**
 * Get safe metric value with fallback
 */
export function getSafeMetricValue(
  metrics: DashboardMetrics, 
  key: keyof DashboardMetrics, 
  fallback: number = 0
): number {
  const value = metrics[key];
  return typeof value === 'number' ? value : fallback;
}

/**
 * Format metric value for display
 */
export function formatMetricValue(value: number | string | undefined, format?: 'number' | 'percentage' | 'currency'): string {
  if (value === undefined || value === null) return '0';
  
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

/**
 * Calculate metric change percentage (for trend indicators)
 */
export function calculateMetricChange(current: number, previous: number): {
  change: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
} {
  const change = current - previous;
  const percentage = previous === 0 ? 0 : (change / previous) * 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (change > 0) trend = 'up';
  else if (change < 0) trend = 'down';
  
  return { change, percentage, trend };
}