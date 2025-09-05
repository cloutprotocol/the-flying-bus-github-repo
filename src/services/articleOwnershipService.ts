/**
 * Article Ownership Validation Service
 * 
 * This service provides comprehensive article ownership validation and management
 * functionality for the role-based access control system.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface ArticleOwnershipResult {
  success: boolean;
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  error?: string;
  article?: ArticleWithOwnership;
}

export interface ArticleWithOwnership {
  id: string;
  title: string;
  content: string;
  author_id: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  updated_at: string;
  submitted_for_review_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  can_edit: boolean;
  can_delete: boolean;
  can_publish: boolean;
  author?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface OwnershipValidationContext {
  userId: string;
  userRole: 'admin' | 'moderator' | 'author' | 'reader';
  articleId: string;
}

/**
 * Check if a user owns a specific article
 */
export async function checkArticleOwnership(
  articleId: string, 
  userId?: string
): Promise<ArticleOwnershipResult> {
  try {
    logger.info(LogSource.ARTICLE, `Checking ownership for article ${articleId}`);

    // Get current user if not provided
    if (!userId) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        return {
          success: false,
          isOwner: false,
          canEdit: false,
          canDelete: false,
          canPublish: false,
          error: 'User not authenticated'
        };
      }
      
      userId = session.user.id;
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      logger.error(LogSource.ARTICLE, 'Error fetching user profile', profileError);
      return {
        success: false,
        isOwner: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        error: 'Failed to fetch user profile'
      };
    }

    // Get article with author information
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        content,
        author_id,
        status,
        created_at,
        updated_at,
        submitted_for_review_at,
        reviewed_by,
        review_notes,
        profiles!articles_author_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('id', articleId)
      .single();

    if (articleError) {
      logger.error(LogSource.ARTICLE, 'Error fetching article', articleError);
      return {
        success: false,
        isOwner: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        error: 'Article not found'
      };
    }

    const isOwner = article.author_id === userId;
    const userRole = profile.role as 'admin' | 'moderator' | 'author' | 'reader';
    
    // Calculate permissions based on ownership and role
    const permissions = calculateArticlePermissions(isOwner, userRole, article.status);

    const articleWithOwnership: ArticleWithOwnership = {
      ...article,
      can_edit: permissions.canEdit,
      can_delete: permissions.canDelete,
      can_publish: permissions.canPublish,
      author: article.profiles ? {
        id: article.profiles.id,
        display_name: article.profiles.display_name,
        avatar_url: article.profiles.avatar_url
      } : undefined
    };

    return {
      success: true,
      isOwner,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canPublish: permissions.canPublish,
      article: articleWithOwnership
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception checking article ownership', error);
    return {
      success: false,
      isOwner: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      error: 'Failed to check article ownership'
    };
  }
}

/**
 * Calculate article permissions based on ownership, user role, and article status
 */
function calculateArticlePermissions(
  isOwner: boolean, 
  userRole: string, 
  articleStatus: string
): { canEdit: boolean; canDelete: boolean; canPublish: boolean } {
  // Admin can do everything
  if (userRole === 'admin') {
    return {
      canEdit: true,
      canDelete: true,
      canPublish: true
    };
  }

  // Moderators can edit and publish but not delete unless they own it
  if (userRole === 'moderator') {
    return {
      canEdit: true,
      canDelete: isOwner,
      canPublish: true
    };
  }

  // Authors can only manage their own articles
  if (userRole === 'author' && isOwner) {
    return {
      canEdit: articleStatus !== 'published', // Can't edit published articles
      canDelete: articleStatus === 'draft', // Can only delete drafts
      canPublish: false // Authors can't publish directly, must submit for review
    };
  }

  // Readers and non-owners have no permissions
  return {
    canEdit: false,
    canDelete: false,
    canPublish: false
  };
}

/**
 * Validate if user can edit a specific article
 */
export async function validateArticleEditPermission(
  articleId: string,
  userId?: string
): Promise<{ canEdit: boolean; error?: string }> {
  const result = await checkArticleOwnership(articleId, userId);
  
  if (!result.success) {
    return { canEdit: false, error: result.error };
  }

  return { canEdit: result.canEdit };
}

/**
 * Get articles filtered by ownership for the current user
 */
export async function getArticlesByOwnership(
  userId?: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  articles: ArticleWithOwnership[];
  count: number;
  error?: string;
}> {
  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        return {
          articles: [],
          count: 0,
          error: 'User not authenticated'
        };
      }
      
      userId = session.user.id;
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      return {
        articles: [],
        count: 0,
        error: 'Failed to fetch user profile'
      };
    }

    const userRole = profile.role as 'admin' | 'moderator' | 'author' | 'reader';
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query based on user role
    let query = supabase
      .from('articles')
      .select(`
        id,
        title,
        content,
        author_id,
        status,
        created_at,
        updated_at,
        profiles!articles_author_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `, { count: 'exact' });

    // Filter by ownership for non-admin users
    if (userRole !== 'admin') {
      query = query.eq('author_id', userId);
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching articles by ownership', error);
      return {
        articles: [],
        count: 0,
        error: 'Failed to fetch articles'
      };
    }

    // Add permission flags to each article
    const articlesWithOwnership: ArticleWithOwnership[] = (data || []).map(article => {
      const isOwner = article.author_id === userId;
      const permissions = calculateArticlePermissions(isOwner, userRole, article.status);

      return {
        ...article,
        can_edit: permissions.canEdit,
        can_delete: permissions.canDelete,
        can_publish: permissions.canPublish,
        author: article.profiles ? {
          id: article.profiles.id,
          display_name: article.profiles.display_name,
          avatar_url: article.profiles.avatar_url
        } : undefined
      };
    });

    return {
      articles: articlesWithOwnership,
      count: count || 0
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception fetching articles by ownership', error);
    return {
      articles: [],
      count: 0,
      error: 'Failed to fetch articles'
    };
  }
}

/**
 * Create utility functions for ownership-based UI rendering
 */
export const ownershipUIUtils = {
  /**
   * Check if edit button should be shown
   */
  shouldShowEditButton: (article: ArticleWithOwnership): boolean => {
    return article.can_edit;
  },

  /**
   * Check if delete button should be shown
   */
  shouldShowDeleteButton: (article: ArticleWithOwnership): boolean => {
    return article.can_delete;
  },

  /**
   * Check if publish button should be shown
   */
  shouldShowPublishButton: (article: ArticleWithOwnership): boolean => {
    return article.can_publish;
  },

  /**
   * Check if submit for review button should be shown
   */
  shouldShowSubmitForReviewButton: (article: ArticleWithOwnership): boolean => {
    return article.can_edit && 
           article.status === 'draft' && 
           !article.can_publish; // Authors can submit for review but not publish directly
  },

  /**
   * Get status badge color based on article status
   */
  getStatusBadgeColor: (status: string): string => {
    switch (status) {
      case 'draft': return 'gray';
      case 'pending': return 'yellow';
      case 'pending_review': return 'yellow';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'published': return 'blue';
      default: return 'gray';
    }
  },

  /**
   * Get user-friendly status text
   */
  getStatusText: (status: string): string => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending Review';
      case 'pending_review': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'published': return 'Published';
      default: return 'Unknown';
    }
  }
};