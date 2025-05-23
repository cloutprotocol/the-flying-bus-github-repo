
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';

/**
 * Optimized service for saving article drafts with minimal validation
 * using the new save_draft_optimized database function
 */
export const useDraftSaveService = () => {
  return { saveDraftOptimized };
};
