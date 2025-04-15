
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Image, Video, Search, Check } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import VideoPlayer from '@/components/Articles/VideoPlayer';

interface MediaGalleryProps {
  onSelectMedia: (url: string, isVideo: boolean) => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ onSelectMedia }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('images');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  
  // Mock data - In a real application, these would come from an API
  const mockImages = [
    { id: '1', url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b', title: 'Laptop', type: 'image' },
    { id: '2', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475', title: 'Circuit Board', type: 'image' },
    { id: '3', url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6', title: 'Code', type: 'image' },
    { id: '4', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', title: 'Woman with Laptop', type: 'image' },
    { id: '5', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5', title: 'Matrix', type: 'image' },
    { id: '6', url: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7', title: 'Code Editor', type: 'image' },
    { id: '7', url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21', title: 'Ocean Wave', type: 'image' },
    { id: '8', url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7', title: 'Woman with Laptop', type: 'image' },
  ];
  
  const mockVideos = [
    { id: 'v1', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Sample Video 1', type: 'video' },
    { id: 'v2', url: 'https://www.youtube.com/embed/jNQXAC9IVRw', title: 'Sample Video 2', type: 'video' },
    { id: 'v3', url: 'https://www.youtube.com/embed/8jLOx1hD3_o', title: 'Sample Video 3', type: 'video' },
    { id: 'v4', url: 'https://www.youtube.com/embed/yIoLQF0I8tc', title: 'Sample Video 4', type: 'video' },
  ];
  
  const displayMedia = activeTab === 'images' ? mockImages : mockVideos;
  const filteredMedia = displayMedia.filter(media => 
    media.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleMediaClick = (url: string) => {
    setSelectedMedia(url);
  };
  
  const handleSelectMedia = () => {
    if (selectedMedia) {
      onSelectMedia(selectedMedia, activeTab === 'videos');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search media..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="images">
            <Image className="mr-2 h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-2 h-4 w-4" />
            Videos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="images" className="mt-4">
          {filteredMedia.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMedia.map(image => (
                <div 
                  key={image.id} 
                  className={`
                    relative cursor-pointer rounded-md overflow-hidden border
                    ${selectedMedia === image.url ? 'ring-2 ring-primary' : 'hover:opacity-80'}
                  `}
                  onClick={() => handleMediaClick(image.url)}
                >
                  {selectedMedia === image.url && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full z-10">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <AspectRatio ratio={16/9}>
                    <img 
                      src={image.url} 
                      alt={image.title} 
                      className="object-cover w-full h-full"
                    />
                  </AspectRatio>
                  <div className="p-2 bg-muted bg-opacity-70 absolute bottom-0 left-0 right-0">
                    <p className="text-xs truncate">{image.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No images found</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="videos" className="mt-4">
          {filteredMedia.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMedia.map(video => (
                <div 
                  key={video.id} 
                  className={`
                    relative cursor-pointer rounded-md overflow-hidden border
                    ${selectedMedia === video.url ? 'ring-2 ring-primary' : 'hover:opacity-80'}
                  `}
                  onClick={() => handleMediaClick(video.url)}
                >
                  {selectedMedia === video.url && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full z-10">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <VideoPlayer 
                    videoUrl={video.url} 
                    title={video.title}
                    showTitlePanel={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No videos found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-4">
        <Button 
          onClick={handleSelectMedia} 
          disabled={!selectedMedia}
        >
          Select Media
        </Button>
      </div>
    </div>
  );
};

export default MediaGallery;
