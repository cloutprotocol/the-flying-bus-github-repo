
import { supabase } from '@/integrations/supabase/client';

export const fetchVideoDetails = async (articleId: string) => {
  const { data, error } = await supabase
    .from('video_articles')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error) {
    console.error('Error fetching video details:', error);
    return null;
  }

  return data;
};

