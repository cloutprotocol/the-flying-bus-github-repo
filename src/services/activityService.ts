
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convex = new ConvexHttpClient(convexUrl);

// Define the valid activity types as they are in the database enum
export type ActivityType = 
  | 'article_created'
  | 'article_updated'
  | 'article_published'
  | 'comment_added'
  | 'comment_edited'
  | 'comment_deleted'
  | 'article_reviewed'
  | 'article_approved'
  | 'article_rejected';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export const getRecentActivities = async (limit: number = 10) => {
  try {
    logger.info(LogSource.ACTIVITY, 'Fetching activities', { limit });
    const data = await convex.query(api.dashboard.getRecentActivities, { limit });
    const transformedActivities = (data || []).map((a: any) => ({
      id: a._id || a.id,
      user_id: a.user_id as string,
      activity_type: a.activity_type as ActivityType,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      metadata: a.metadata as Record<string, any>,
      created_at: a.created_at,
      profile: a.profile || undefined,
    }));
    logger.info(LogSource.ACTIVITY, `Fetched ${transformedActivities.length} activities successfully`);
    return { activities: transformedActivities, error: null, count: transformedActivities.length };
  } catch (e) {
    logger.error(LogSource.ACTIVITY, 'Exception fetching activities', e);
    return { activities: [], error: e, count: 0 };
  }
};

// Add a helper function to create activity records
export const createActivity = async (
  userId: string,
  activityType: ActivityType, // Use the strict ActivityType instead of string
  entityType: string,
  entityId: string,
  metadata: Record<string, any> = {}
) => {
  try {
    logger.info(LogSource.ACTIVITY, 'Creating activity record', { 
      userId, activityType, entityType, entityId 
    });
    const id = await convex.mutation(api.activities.logActivity, {
      user_id: userId as Id<'profiles'>,
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
    logger.info(LogSource.ACTIVITY, 'Activity record created successfully', { activityId: id, activityType });
    return { success: true, activity: { id }, error: null } as any;
  } catch (e) {
    logger.error(LogSource.ACTIVITY, 'Exception creating activity record', e);
    return { success: false, error: e };
  }
};
