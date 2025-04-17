
/**
 * Types for the moderation system
 */

export type ContentType = 'article' | 'comment' | 'profile' | 'media';
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'review';

export interface ModerationStatsResponse {
  stats: {
    byStatus: Array<{
      status: string;
      count: number;
    }> | null;
    byContentType: Array<{
      content_type: string;
      count: number;
    }> | null;
    recentActivity: Array<{
      id: string;
      content_id: string;
      content_type: string;
      status: string;
      created_at: string;
      reviewed_at: string | null;
      reviewer: {
        id: string;
        display_name: string;
        avatar_url: string | null;
      } | null;
    }> | null;
    pendingCount: number;
    totalCount: number;
  } | null;
  error: any;
}

export interface ModeratorPerformanceResponse {
  performance: {
    moderatorStats: Array<{
      moderator_id: string;
      display_name: string;
      avatar_url: string | null;
      total_reviews: number;
      average_response_time: number;
    }> | null;
    timeframeStats: {
      total_reviews: number;
      average_response_time: number;
      resolution_rate: number;
    } | null;
  } | null;
  error: any;
}
