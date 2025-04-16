
/**
 * Core moderation service functionality
 */

import { supabase } from '@/integrations/supabase/client';
import { LogSource } from '@/utils/logger/types';
import { logger } from '@/utils/logger/logger';
import { ContentType, ModerationAction } from './types';

/**
 * Utility function to simulate function calls
 * This is maintained for backward compatibility
 */
export const getModerationMetrics = () => {
  return import('./statsService').then(module => module.getModerationStats());
};
