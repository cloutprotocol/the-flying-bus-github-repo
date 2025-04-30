
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
    // Use a more direct query approach with explicit join
    const { data: activities, error, count } = await supabase
      .from('activities')
      .select(`
        id,
        user_id,
        activity_type,
        entity_type,
        entity_id,
        metadata,
        created_at,
        profiles!user_id(
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(LogSource.ACTIVITY, 'Error fetching activities', error);
      return { activities: [], error, count: 0 };
    }

    // Transform the data to match our Activity interface
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      user_id: activity.user_id,
      activity_type: activity.activity_type as ActivityType,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      metadata: activity.metadata,
      created_at: activity.created_at,
      profile: activity.profiles
    }));

    logger.info(LogSource.ACTIVITY, `Fetched ${transformedActivities.length} activities successfully`);
    return { activities: transformedActivities, error: null, count: count || 0 };
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
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        entity_type: entityType,
        entity_id: entityId,
        metadata
      })
      .select()
      .single();

    if (error) {
      logger.error(LogSource.ACTIVITY, 'Error creating activity record', error);
      return { success: false, error };
    }

    logger.info(LogSource.ACTIVITY, 'Activity record created successfully', {
      activityId: data.id,
      activityType
    });
    return { success: true, activity: data, error: null };
  } catch (e) {
    logger.error(LogSource.ACTIVITY, 'Exception creating activity record', e);
    return { success: false, error: e };
  }
};
