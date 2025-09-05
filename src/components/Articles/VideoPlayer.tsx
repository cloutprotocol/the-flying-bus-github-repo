import React from 'react';
import { Film } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { convertToYouTubeEmbed, isYouTubeUrl } from '@/utils/video/youtubeUtils';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  aspectRatio?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  title, 
  aspectRatio = 16/9
}) => {
  // Determine if it's a YouTube video and convert to embed URL if needed
  const isYoutubeVideo = isYouTubeUrl(videoUrl);
  const embedUrl = isYoutubeVideo ? convertToYouTubeEmbed(videoUrl) : videoUrl;
  
  // For vertical videos (e.g., 9:16), add max-width to keep it contained
  const isVerticalVideo = aspectRatio < 1;
  
  return (
    <div className="mb-6 rounded-xl overflow-hidden shadow-md">
      <div className="relative flex justify-center bg-black">
        <AspectRatio 
          ratio={aspectRatio} 
          className={isVerticalVideo ? 'w-full max-w-[400px] mx-auto' : 'w-full'}
        >
          {isYoutubeVideo ? (
            <iframe 
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0 rounded-xl"
            />
          ) : (
            <video 
              controls
              className="w-full h-full object-contain rounded-xl"
              poster={embedUrl.endsWith('.mp4') ? undefined : embedUrl}
            >
              {embedUrl.endsWith('.mp4') && <source src={embedUrl} type="video/mp4" />}
              Your browser does not support the video tag.
            </video>
          )}
        </AspectRatio>
        
        {!isYoutubeVideo && !embedUrl.endsWith('.mp4') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 rounded-full bg-flyingbus-yellow bg-opacity-80 flex items-center justify-center">
              <Film size={40} className="text-black" />
            </div>
            <p className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              Video preview unavailable
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
