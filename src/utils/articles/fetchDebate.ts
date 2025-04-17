
import { supabase } from '@/integrations/supabase/client';

export const fetchDebateSettings = async (articleId: string) => {
  const { data, error } = await supabase
    .from('debate_articles')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error) {
    console.error('Error fetching debate settings:', error);
    return null;
  }

  return data;
};

