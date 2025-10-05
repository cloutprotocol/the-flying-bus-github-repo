import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VideoDebugProps {
  articleId: string;
}

const VideoDebugComponent: React.FC<VideoDebugProps> = ({ articleId }) => {
  const [debugData, setDebugData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        console.log('VideoDebugComponent - Fetching data for article:', articleId);
        
        const { data, error } = await supabase
          .from('articles')
          .select(`
            id, 
            title, 
            category_id,
            article_type,
            categories(id, name, slug, color),
            video_articles(video_url, video_duration)
          `)
          .eq('id', articleId)
          .eq('status', 'published')
          .single();

        if (error) {
          console.error('VideoDebugComponent - Error:', error);
          setError(error.message);
          return;
        }

        console.log('VideoDebugComponent - Raw data:', data);
        setDebugData(data);
      } catch (e) {
        console.error('VideoDebugComponent - Exception:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    };

    if (articleId) {
      fetchDebugData();
    }
  }, [articleId]);

  if (error) {
    return (
      <div style={{ padding: '20px', border: '2px solid red', margin: '20px' }}>
        <h3>Video Debug - Error</h3>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!debugData) {
    return (
      <div style={{ padding: '20px', border: '2px solid blue', margin: '20px' }}>
        <h3>Video Debug - Loading...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '2px solid green', margin: '20px' }}>
      <h3>Video Debug Component</h3>
      <p><strong>Article ID:</strong> {debugData.id}</p>
      <p><strong>Title:</strong> {debugData.title}</p>
      <p><strong>Category:</strong> {debugData.categories?.name}</p>
      <p><strong>Article Type:</strong> {debugData.article_type}</p>
      <p><strong>Video Articles:</strong> {JSON.stringify(debugData.video_articles)}</p>
      <p><strong>Has Video URL:</strong> {debugData.video_articles?.[0]?.video_url ? 'YES' : 'NO'}</p>
      {debugData.video_articles?.[0]?.video_url && (
        <p><strong>Video URL:</strong> {debugData.video_articles[0].video_url}</p>
      )}
    </div>
  );
};

export default VideoDebugComponent;