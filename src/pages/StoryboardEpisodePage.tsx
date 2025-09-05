
import React from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { StoryboardArticleProps } from '@/data/articles/storyboard';
import { getArticleByIdSync } from '@/data/articles';
import VideoPlayer from '@/components/Articles/VideoPlayer';
import EpisodeHeader from '@/components/Storyboard/EpisodeHeader';
import EpisodeDetails from '@/components/Storyboard/EpisodeDetails';
import EpisodeNavigation from '@/components/Storyboard/EpisodeNavigation';
import MoreEpisodes from '@/components/Storyboard/MoreEpisodes';
import NotFoundMessage from '@/components/Storyboard/NotFoundMessage';

const StoryboardEpisodePage = () => {
  const { seriesId, episodeId } = useParams<{ seriesId: string, episodeId: string }>();
  
  // Get the series (storyboard article)
  const series = getArticleByIdSync(seriesId || '') as StoryboardArticleProps | undefined;
  
  if (!series || !series.episodes) {
    return (
      <MainLayout>
        <NotFoundMessage type="series" />
      </MainLayout>
    );
  }
  
  // Find the current episode
  const currentEpisode = series.episodes.find(ep => ep.id === episodeId);
  
  if (!currentEpisode) {
    return (
      <MainLayout>
        <NotFoundMessage type="episode" seriesId={seriesId} />
      </MainLayout>
    );
  }
  
  // Find the current episode index
  const currentIndex = series.episodes.findIndex(ep => ep.id === episodeId);
  const prevEpisode = currentIndex > 0 ? series.episodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < series.episodes.length - 1 ? series.episodes[currentIndex + 1] : null;

  // Filter episodes for "More Episodes" section (excluding current)
  const otherEpisodes = series.episodes.filter(ep => ep.id !== currentEpisode.id);

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-flyingbus-background to-white py-6">
        <div className="container mx-auto px-4">
          <EpisodeHeader seriesId={seriesId || ''} seriesTitle={series.title} />
          
          {/* Main content: Video next to Details */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Video section - optimized for 9:16 aspect ratio */}
            <div className="lg:col-span-4 md:mx-auto w-full">
              <VideoPlayer 
                videoUrl={currentEpisode.videoUrl} 
                title={currentEpisode.title}
                showTitlePanel={false}
                duration={currentEpisode.duration}
                aspectRatio={9/16}
              />
              
              {/* Mobile navigation buttons */}
              <EpisodeNavigation 
                prevEpisode={prevEpisode}
                nextEpisode={nextEpisode}
                seriesId={seriesId || ''}
              />
            </div>
            
            {/* Content section - details + more episodes */}
            <div className="lg:col-span-8">
              {/* Episode details with desktop navigation */}
              <EpisodeDetails 
                currentEpisode={currentEpisode}
                prevEpisode={prevEpisode}
                nextEpisode={nextEpisode}
                seriesId={seriesId || ''}
                currentIndex={currentIndex}
                totalEpisodes={series.episodes.length}
              />
              
              {/* More episodes section */}
              <MoreEpisodes 
                episodes={otherEpisodes}
                seriesId={seriesId || ''}
                allEpisodesCount={otherEpisodes.length}
              />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default StoryboardEpisodePage;
