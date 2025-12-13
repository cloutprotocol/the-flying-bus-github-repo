
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const fetchDebateSettings = async (articleId: string) => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching debate settings', { articleId });
    // Legacy Supabase path removed. Debate settings are included via Convex articles query.
    // Return null to indicate no separate debate metadata fetch is needed.
    return null;
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception fetching debate settings', { error, articleId });
    return null;
  }
};
