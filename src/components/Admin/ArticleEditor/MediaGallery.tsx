
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Image, Video, Search, Check } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import VideoPlayer from '@/components/Articles/VideoPlayer';
import { useSimpleMediaManager } from '@/hooks/useSimpleMediaManager';

interface MediaGalleryProps {
  onSelectMedia: (url: string, isVideo: boolean) => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ onSelectMedia }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('images');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  
  // Use real media data instead of mock data
  const { 
    media, 
    loading, 
    filter, 
    setFilter, 
    searchTerm: hookSearchTerm, 
    setSearchTerm: setHookSearchTerm 
  } = useSimpleMediaManager();

  // Update the hook's search term when local search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHookSearchTerm(searchTerm);
    }, 300); // Debounce search
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, setHookSearchTerm]);

  // Update filter when tab changes
  useEffect(() => {
    if (activeTab === 'images') {
      setFilter('image');
    } else if (activeTab === 'videos') {
      setFilter('video');
    }
  }, [activeTab, setFilter]);

  // Transform media data to match expected format
  const displayMedia = media.map(item => ({
    id: item.id,
    url: item.url,
    title: item.filename,
    type: item.file_type
  }));

  const filteredMedia = displayMedia;
  
  const handleMediaClick = (url: string) => {
    setSelectedMedia(url);
  };
  
  const handleSelectMedia = () => {
    if (selectedMedia) {
      onSelectMedia(selectedMedia, activeTab === 'videos');
    }
  };
  
  // Handle the case where media fails to load
  if (!loading && !media) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load media gallery</p>
        <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
      </div>
    );
  }

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
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading media assets...</p>
            </div>
          ) : filteredMedia.length > 0 ? (
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
                      loading="lazy"
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
              <p className="text-muted-foreground">
                {searchTerm ? 'No images found matching your search' : 'No images uploaded yet'}
              </p>
              {!searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Switch to the Upload tab to add your first image
                </p>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="videos" className="mt-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading media assets...</p>
            </div>
          ) : filteredMedia.length > 0 ? (
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
                  <AspectRatio ratio={16/9}>
                    <video 
                      src={video.url} 
                      className="object-cover w-full h-full"
                      controls={false}
                      muted
                    />
                  </AspectRatio>
                  <div className="p-2 bg-muted bg-opacity-70 absolute bottom-0 left-0 right-0">
                    <p className="text-xs truncate">{video.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No videos found matching your search' : 'No videos uploaded yet'}
              </p>
              {!searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Switch to the Upload tab to add your first video
                </p>
              )}
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
