
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Checkbox } from '@/components/ui/checkbox';
import { Video } from 'lucide-react';
import VideoPlayer from '@/components/Articles/VideoPlayer';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  type: string;
  date: string;
}

interface MediaGridProps {
  media: MediaItem[];
  selectedMedia: string[];
  onMediaSelect: (id: string) => void;
  videoGridCols?: string;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  media,
  selectedMedia,
  onMediaSelect,
  videoGridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
}) => {
  const gridCols = media.some(item => item.type === 'video') 
    ? videoGridCols 
    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {media.map(item => (
        <Card 
          key={item.id} 
          className={`cursor-pointer overflow-hidden ${
            selectedMedia.includes(item.id) ? 'ring-2 ring-primary' : ''
          }`}
        >
          <div className="relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox 
                checked={selectedMedia.includes(item.id)}
                onCheckedChange={() => onMediaSelect(item.id)}
              />
            </div>
            
            {item.type === 'image' ? (
              <AspectRatio ratio={16/9}>
                <img 
                  src={item.url} 
                  alt={item.title} 
                  className="object-cover w-full h-full" 
                  onClick={() => onMediaSelect(item.id)}
                />
              </AspectRatio>
            ) : (
              <VideoPlayer 
                videoUrl={item.url} 
                title={item.title}
                showTitlePanel={false}
              />
            )}
          </div>
          <CardContent className="p-2">
            <p className="text-sm truncate font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.date}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MediaGrid;
