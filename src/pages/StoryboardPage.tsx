
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { StoryboardArticleProps } from '@/data/articles/storyboard';
import { getArticleByIdSync, getArticleById } from '@/data/articles';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import SeriesHeader from '@/components/Storyboard/SeriesHeader';
import EpisodesList from '@/components/Storyboard/EpisodesList';
import StoryboardNotFound from '@/components/Storyboard/StoryboardNotFound';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';
import { Play } from 'lucide-react';

const StoryboardPage = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const [article, setArticle] = useState<StoryboardArticleProps | ArticleProps | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!seriesId) {
        setIsLoading(false);
        return;
      }

      // First try sync version for mock data (storyboard articles with episodes)
      const syncArticle = getArticleByIdSync(seriesId) as StoryboardArticleProps | undefined;
      if (syncArticle && 'episodes' in syncArticle && syncArticle.episodes) {
        setArticle(syncArticle);
        setIsLoading(false);
        return;
      }

      // If not found in mock data, try async version for database articles
      try {
        const asyncArticle = await getArticleById(seriesId);
        setArticle(asyncArticle);
      } catch (error) {
        console.error('Error fetching article:', error);
      }
      
      setIsLoading(false);
    };

    fetchArticle();
  }, [seriesId]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-gray-600">Loading series...</p>
        </div>
      </MainLayout>
    );
  }
  
  // Check if article exists
  if (!article) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Series Not Found</h1>
          <p className="text-gray-600 mb-8">
            Sorry, we couldn't find the series you're looking for.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              You can browse all available storyboard series below:
            </p>
            <a 
              href="/storyboard" 
              className="inline-block bg-flyingbus-blue text-white px-6 py-3 rounded-lg hover:bg-flyingbus-blue/90 transition-colors"
            >
              Browse All Series
            </a>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Check if this is a mock article with episodes
  const isStoryboardWithEpisodes = 'episodes' in article && article.episodes && article.episodes.length > 0;

  if (isStoryboardWithEpisodes) {
    // This is a mock storyboard article with episodes - show the full series page
    return (
      <MainLayout>
        <SeriesHeader article={article as StoryboardArticleProps} />
        <EpisodesList episodes={(article as StoryboardArticleProps).episodes} seriesId={seriesId || ''} />
      </MainLayout>
    );
  }

  // This is a database article (storyboard type but no episodes structure yet)
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-flyingbus-purple text-white px-3 py-1 rounded-full text-sm font-medium">
                Storyboard
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                Episodes Coming Soon
              </span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
            <p className="text-xl text-gray-600 mb-6">{article.excerpt}</p>
            <div className="flex items-center text-sm text-gray-500 mb-6">
              <span>By {article.author}</span>
              <span className="mx-2">•</span>
              <span>{article.date}</span>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-flyingbus-purple rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Episodes Coming Soon!</h2>
              <p className="text-gray-600 mb-6">
                This storyboard series is currently in development. Episodes will be added soon to bring this story to life.
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                In the meantime, you can browse other available series:
              </p>
              <a 
                href="/storyboard" 
                className="inline-block bg-flyingbus-purple text-white px-6 py-3 rounded-lg hover:bg-flyingbus-purple/90 transition-colors"
              >
                Browse All Series
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default StoryboardPage;
