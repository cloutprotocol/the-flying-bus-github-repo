
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export const getRecentActivities = async (limit: number = 10) => {
  try {
    const { data: activities, error, count } = await supabase
      .from('activities')
      .select(`
        *,
        profiles:user_id (
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

    return { activities, error: null, count: count || 0 };
  } catch (e) {
    logger.error(LogSource.ACTIVITY, 'Exception fetching activities', e);
    return { activities: [], error: e, count: 0 };
  }
};
