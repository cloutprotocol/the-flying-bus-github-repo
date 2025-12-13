import React, { useEffect, useState } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

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
        const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
        const data = await convex.query(api.articles.getById, { articleId: articleId as any as Id<'articles'> });
        if (!data || data.status !== 'published') {
          setError('Article not found or not published');
          return;
        }
        console.log('VideoDebugComponent - Raw data:', data);
        setDebugData({
          id: String(data._id),
          title: data.title,
          categories: data.category ? { name: data.category.name } : null,
          article_type: data.article_type,
          video_articles: data.videoData ? [{ video_url: data.videoData.video_url, video_duration: data.videoData.video_duration }] : [],
        });
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
