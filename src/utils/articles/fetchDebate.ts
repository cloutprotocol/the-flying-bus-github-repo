
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const fetchDebateSettings = async (articleId: string) => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching debate settings', { articleId });
    
    const { data, error } = await supabase
      .from('debate_articles')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (error) {
      // If no debate settings found, return null (not an error for non-debate articles)
      if (error.code === 'PGRST116') {
        logger.info(LogSource.DATABASE, 'No debate settings found for article', { articleId });
        return null;
      }
      logger.error(LogSource.DATABASE, 'Error fetching debate settings', { error, articleId });
      return null;
    }

    if (!data) {
      logger.info(LogSource.DATABASE, 'No debate data returned', { articleId });
      return null;
    }

    // Vote counts will be fetched separately by the voting component
    const initialVotes = { yes: 0, no: 0 };

    // Map database fields to frontend format
    const mappedData = {
      question: data.question,
      yes_position: data.yes_position,
      no_position: data.no_position,
      voting_enabled: data.voting_enabled,
      voting_ends_at: data.voting_ends_at,
      initialVotes
    };

    logger.info(LogSource.DATABASE, 'Debate settings fetched successfully', { 
      articleId,
      hasQuestion: !!mappedData.question,
      hasYesPosition: !!mappedData.yes_position,
      hasNoPosition: !!mappedData.no_position
    });

    return mappedData;
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception fetching debate settings', { error, articleId });
    return null;
  }
};
