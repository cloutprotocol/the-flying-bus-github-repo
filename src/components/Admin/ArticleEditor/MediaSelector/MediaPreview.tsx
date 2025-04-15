
import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { X, Image } from 'lucide-react';
import VideoPlayer from '@/components/Articles/VideoPlayer';

interface MediaPreviewProps {
  previewMedia: string;
  isVideo: boolean;
  onRemove: () => void;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ 
  previewMedia, 
  isVideo, 
  onRemove 
}) => {
  if (!previewMedia) {
    return (
      <div className="rounded-md overflow-hidden border bg-muted flex items-center justify-center h-[150px]">
        <div className="text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-sm">Media preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border bg-muted relative">
      <button 
        onClick={onRemove}
        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-10"
        type="button"
        aria-label="Remove media"
      >
        <X className="h-4 w-4" />
      </button>
      
      {isVideo ? (
        <VideoPlayer 
          videoUrl={previewMedia} 
          title="Preview" 
          showTitlePanel={false}
        />
      ) : (
        <AspectRatio ratio={16/9}>
          <img 
            src={previewMedia} 
            alt="Preview" 
            className="object-cover w-full h-full"
            onError={() => onRemove()}
          />
        </AspectRatio>
      )}
    </div>
  );
};

export default MediaPreview;
