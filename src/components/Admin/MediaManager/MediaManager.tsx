
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FolderOpen, Image, Video } from 'lucide-react';
import MediaToolbar from './MediaToolbar';
import MediaGrid from './MediaGrid';
import MediaList from './MediaList';
import FilterPanel from './FilterPanel';
import SelectionToolbar from './SelectionToolbar';
import MediaUploader from '@/components/Admin/ArticleEditor/MediaUploader';

const MediaManager = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  
  const mockImages = [
    { id: '1', url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b', title: 'Laptop', type: 'image', date: '2023-04-15' },
    { id: '2', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475', title: 'Circuit Board', type: 'image', date: '2023-04-14' },
    { id: '3', url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6', title: 'Code', type: 'image', date: '2023-04-12' },
    { id: '4', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', title: 'Woman with Laptop', type: 'image', date: '2023-04-10' },
    { id: '5', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5', title: 'Matrix', type: 'image', date: '2023-04-05' },
    { id: '6', url: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7', title: 'Code Editor', type: 'image', date: '2023-04-03' },
    { id: '7', url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21', title: 'Ocean Wave', type: 'image', date: '2023-03-28' },
    { id: '8', url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7', title: 'Woman with Laptop', type: 'image', date: '2023-03-25' },
  ];
  
  const mockVideos = [
    { id: 'v1', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Sample Video 1', type: 'video', date: '2023-04-18' },
    { id: 'v2', url: 'https://www.youtube.com/embed/jNQXAC9IVRw', title: 'Sample Video 2', type: 'video', date: '2023-04-16' },
    { id: 'v3', url: 'https://www.youtube.com/embed/8jLOx1hD3_o', title: 'Sample Video 3', type: 'video', date: '2023-04-11' },
    { id: 'v4', url: 'https://www.youtube.com/embed/yIoLQF0I8tc', title: 'Sample Video 4', type: 'video', date: '2023-04-06' },
  ];
  
  const handleMediaSelect = (id: string) => {
    if (selectedMedia.includes(id)) {
      setSelectedMedia(selectedMedia.filter(mediaId => mediaId !== id));
    } else {
      setSelectedMedia([...selectedMedia, id]);
    }
  };
  
  const handleMediaUpload = (url: string, isVideo: boolean) => {
    console.log('Media uploaded:', url, 'Is video:', isVideo);
    // In a real app, we would update the state with the new media
  };
  
  const handleSelectAll = () => {
    const allMediaIds = [...mockImages, ...mockVideos].map(media => media.id);
    setSelectedMedia(allMediaIds);
  };
  
  const handleDeselectAll = () => {
    setSelectedMedia([]);
  };
  
  const handleDeleteSelected = () => {
    // In a real app, we would delete the selected media
    console.log('Deleting media:', selectedMedia);
    setSelectedMedia([]);
  };
  
  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Media Manager</h1>
            <p className="text-muted-foreground">
              Organize and manage your media files
            </p>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Media
          </Button>
        </div>
        
        <Tabs defaultValue="all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 mb-4">
            <TabsList>
              <TabsTrigger value="all">
                <FolderOpen className="mr-2 h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="images">
                <Image className="mr-2 h-4 w-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Video className="mr-2 h-4 w-4" />
                Videos
              </TabsTrigger>
            </TabsList>
            
            <MediaToolbar 
              viewMode={viewMode} 
              setViewMode={setViewMode} 
              filterOpen={filterOpen}
              setFilterOpen={setFilterOpen}
            />
          </div>
          
          {filterOpen && <FilterPanel />}
          
          {selectedMedia.length > 0 && (
            <SelectionToolbar 
              selectedCount={selectedMedia.length}
              onDeselectAll={handleDeselectAll}
              onDeleteSelected={handleDeleteSelected}
            />
          )}
          
          <TabsContent value="all">
            {viewMode === 'grid' ? (
              <MediaGrid 
                media={[...mockImages, ...mockVideos]} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            ) : (
              <MediaList 
                media={[...mockImages, ...mockVideos]} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            )}
          </TabsContent>
          
          <TabsContent value="images">
            {viewMode === 'grid' ? (
              <MediaGrid 
                media={mockImages} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            ) : (
              <MediaList 
                media={mockImages} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            )}
          </TabsContent>
          
          <TabsContent value="videos">
            {viewMode === 'grid' ? (
              <MediaGrid 
                media={mockVideos} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
                videoGridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              />
            ) : (
              <MediaList 
                media={mockVideos} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
};

export default MediaManager;
