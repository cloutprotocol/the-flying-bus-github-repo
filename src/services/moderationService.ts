import { LogSource } from '@/utils/logger/types';
import { logger } from '@/utils/logger/logger';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// Content types for moderation
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

// Moderation action types
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'review';

/**
 * Log a moderation action
 */
export const logModerationAction = async (
  contentId: string,
  contentType: ContentType,
  action: ModerationAction,
  moderatorId: string,
  notes?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.MODERATION, 'Logging moderation action', {
      contentId,
      contentType,
      action,
      moderatorId
    });
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    await convex.mutation(api.activities.logActivity, {
      user_id: moderatorId as unknown as Id<'profiles'>,
      activity_type: `moderation:${action}`,
      entity_type: contentType,
      entity_id: contentId,
      metadata: { notes: notes || null },
    } as any);
    
    logger.info(LogSource.MODERATION, 'Moderation action logged successfully', {
      contentId,
      contentType,
      action
    });
    
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception logging moderation action', e);
    return { success: false, error: e };
  }
};

/**
 * Get moderation statistics
 */
export const getModerationStats = async (): Promise<{
  stats: any;
  error: any;
}> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching moderation statistics');
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const types = ['moderation:approve','moderation:reject','moderation:flag','moderation:review'];

    const byAction: Array<{ action: string; count: number }> = [];
    const allActivities: any[] = [];
    for (const t of types) {
      const res: any = await convex.query(api.activities.getByType, { activityType: t });
      const count = res?.count ?? (res?.activities?.length ?? 0);
      byAction.push({ action: t.split(':')[1], count });
      if (res?.activities) allActivities.push(...res.activities);
    }
    // derive content types from metadata/entity_type
    const byContentTypeMap: Record<string, number> = {};
    for (const a of allActivities) {
      const ct = (a.entity_type || 'unknown').toLowerCase();
      byContentTypeMap[ct] = (byContentTypeMap[ct] || 0) + 1;
    }
    const byContentType = Object.entries(byContentTypeMap).map(([content_type, count]) => ({ content_type, count }));

    // recent activity: sort by created_at desc, take 10
    allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentActivity = allActivities.slice(0, 10).map(a => ({
      id: a._id,
      content_id: a.entity_id,
      content_type: a.entity_type,
      status: 'reviewed',
      reviewed_at: a.created_at,
      reviewer: { display_name: '', avatar_url: '' },
      reason: a.metadata?.notes ?? '',
    }));

    const stats = {
      byStatus: [],
      byContentType,
      recentActivity,
      pendingCount: 0,
      totalCount: allActivities.length,
      byAction,
    };

    logger.info(LogSource.MODERATION, 'Moderation statistics fetched successfully');
    return { stats, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderation statistics', e);
    return { stats: null, error: e };
  }
};

/**
 * Get moderator performance metrics
 */
export const getModeratorPerformance = async (): Promise<{
  performance: any;
  error: any;
}> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching moderator performance metrics');
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const res: any = await convex.query(api.activities.getByType, { activityType: 'moderation:review' });
    const byReviewer: Record<string, { reviewer_id: string; count: number; profiles?: any }> = {};
    for (const a of res?.activities ?? []) {
      const uid = a.user_id;
      if (!byReviewer[uid]) byReviewer[uid] = { reviewer_id: uid, count: 0 };
      byReviewer[uid].count++;
    }
    const performance = { moderatorActivity: Object.values(byReviewer) };
    
    logger.info(LogSource.MODERATION, 'Moderator performance metrics fetched successfully');
    return { performance, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderator performance', e);
    return { performance: null, error: e };
  }
};

/**
 * Get all moderation metrics
 * This function combines stats and performance metrics for the dashboard
 */
export const getModerationMetrics = async (): Promise<{
  stats: any;
  error: any;
}> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching combined moderation metrics');
    
    // Get moderation stats
    const { stats, error: statsError } = await getModerationStats();
    if (statsError) {
      return { stats: null, error: statsError };
    }
    
    // Get performance metrics
    const { performance, error: perfError } = await getModeratorPerformance();
    if (perfError) {
      return { stats: null, error: perfError };
    }
    
    // Combine data for the dashboard
    const combinedStats = {
      ...stats,
      moderatorsCount: performance?.moderatorActivity?.length || 0,
      topModerators: performance?.moderatorActivity?.slice(0, 5) || [],
      // Add placeholder data for metrics not yet implemented
      reportedCount: stats?.byAction?.find((s: any) => s.action === 'flag')?.count || 0,
      flaggedUsersCount: 0,
      // Add action counts (get from recentActivity or return placeholders)
      byAction: [
        { action: 'approve', count: stats?.recentActivity?.filter((a: any) => a.status === 'reviewed' && a.reason?.includes('approve'))?.length || 0 },
        { action: 'reject', count: stats?.recentActivity?.filter((a: any) => a.status === 'reviewed' && a.reason?.includes('reject'))?.length || 0 },
        { action: 'flag', count: stats?.recentActivity?.filter((a: any) => a.status === 'pending')?.length || 0 }
      ],
      // Format the recent actions for the dashboard
      recentActions: stats?.recentActivity?.map((activity: any) => {
        let action = 'review';
        if (activity.reason?.includes('approve')) action = 'approve';
        if (activity.reason?.includes('reject')) action = 'reject';
        if (activity.status === 'pending') action = 'flag';
        
        return {
          id: activity.id,
          content_id: activity.content_id,
          content_type: activity.content_type,
          action,
          moderator_name: activity.reviewer?.display_name || 'Unknown',
          created_at: activity.reviewed_at || activity.created_at
        };
      }) || []
    };
    
    logger.info(LogSource.MODERATION, 'Combined moderation metrics fetched successfully');
    return { stats: combinedStats, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching combined moderation metrics', e);
    return { stats: null, error: e };
  }
};
