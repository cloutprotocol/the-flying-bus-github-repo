
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gallery, Image, Upload, Video, Search, Filter, SlidersHorizontal, Grid2X2, List, Trash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Checkbox } from '@/components/ui/checkbox';
import VideoPlayer from '@/components/Articles/VideoPlayer';
import MediaUploader from '@/components/Admin/ArticleEditor/MediaUploader';

const MediaManager = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Mock data - In a real application, these would come from an API
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
                <Gallery className="mr-2 h-4 w-4" />
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
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <div className="relative w-[200px] sm:w-[300px]">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  className="pl-8"
                />
              </div>
              
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-10 rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-10 rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {filterOpen && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Date Range</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This week</SelectItem>
                        <SelectItem value="month">This month</SelectItem>
                        <SelectItem value="year">This year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>File Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Sort By</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Date added (newest)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Date added (newest)</SelectItem>
                        <SelectItem value="oldest">Date added (oldest)</SelectItem>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end space-x-2">
                    <Button className="flex-1">Apply Filters</Button>
                    <Button variant="outline" size="icon">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {selectedMedia.length > 0 && (
            <div className="bg-muted p-3 rounded-md flex items-center justify-between mb-4">
              <div className="text-sm">
                {selectedMedia.length} items selected
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
          
          <TabsContent value="all">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...mockImages, ...mockVideos].map(media => (
                  <Card 
                    key={media.id} 
                    className={`cursor-pointer overflow-hidden ${
                      selectedMedia.includes(media.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox 
                          checked={selectedMedia.includes(media.id)}
                          onCheckedChange={() => handleMediaSelect(media.id)}
                        />
                      </div>
                      
                      {media.type === 'image' ? (
                        <AspectRatio ratio={16/9}>
                          <img 
                            src={media.url} 
                            alt={media.title} 
                            className="object-cover w-full h-full" 
                            onClick={() => handleMediaSelect(media.id)}
                          />
                        </AspectRatio>
                      ) : (
                        <VideoPlayer 
                          videoUrl={media.url} 
                          title={media.title}
                          showTitlePanel={false}
                        />
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-sm truncate font-medium">{media.title}</p>
                      <p className="text-xs text-muted-foreground">{media.date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {[...mockImages, ...mockVideos].map(media => (
                  <div 
                    key={media.id}
                    className={`flex items-center py-3 ${
                      selectedMedia.includes(media.id) ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="pl-2 pr-4">
                      <Checkbox 
                        checked={selectedMedia.includes(media.id)}
                        onCheckedChange={() => handleMediaSelect(media.id)}
                      />
                    </div>
                    
                    <div className="w-16 h-16 rounded overflow-hidden mr-4">
                      {media.type === 'image' ? (
                        <img 
                          src={media.url} 
                          alt={media.title} 
                          className="object-cover w-full h-full" 
                        />
                      ) : (
                        <div className="bg-blue-100 h-full flex items-center justify-center">
                          <Video className="h-8 w-8 text-blue-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow">
                      <p className="font-medium">{media.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {media.type === 'image' ? 'Image' : 'Video'} • {media.date}
                      </p>
                    </div>
                    
                    <div className="pr-4">
                      <Button variant="ghost" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="images">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mockImages.map(image => (
                  <Card 
                    key={image.id} 
                    className={`cursor-pointer overflow-hidden ${
                      selectedMedia.includes(image.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox 
                          checked={selectedMedia.includes(image.id)}
                          onCheckedChange={() => handleMediaSelect(image.id)}
                        />
                      </div>
                      
                      <AspectRatio ratio={16/9}>
                        <img 
                          src={image.url} 
                          alt={image.title} 
                          className="object-cover w-full h-full" 
                          onClick={() => handleMediaSelect(image.id)}
                        />
                      </AspectRatio>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-sm truncate font-medium">{image.title}</p>
                      <p className="text-xs text-muted-foreground">{image.date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {mockImages.map(image => (
                  <div 
                    key={image.id}
                    className={`flex items-center py-3 ${
                      selectedMedia.includes(image.id) ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="pl-2 pr-4">
                      <Checkbox 
                        checked={selectedMedia.includes(image.id)}
                        onCheckedChange={() => handleMediaSelect(image.id)}
                      />
                    </div>
                    
                    <div className="w-16 h-16 rounded overflow-hidden mr-4">
                      <img 
                        src={image.url} 
                        alt={image.title} 
                        className="object-cover w-full h-full" 
                      />
                    </div>
                    
                    <div className="flex-grow">
                      <p className="font-medium">{image.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Image • {image.date}
                      </p>
                    </div>
                    
                    <div className="pr-4">
                      <Button variant="ghost" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="videos">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mockVideos.map(video => (
                  <Card 
                    key={video.id} 
                    className={`cursor-pointer overflow-hidden ${
                      selectedMedia.includes(video.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox 
                          checked={selectedMedia.includes(video.id)}
                          onCheckedChange={() => handleMediaSelect(video.id)}
                        />
                      </div>
                      
                      <VideoPlayer 
                        videoUrl={video.url} 
                        title={video.title}
                        showTitlePanel={false}
                      />
                    </div>
                    <CardContent className="p-2">
                      <p className="text-sm truncate font-medium">{video.title}</p>
                      <p className="text-xs text-muted-foreground">{video.date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {mockVideos.map(video => (
                  <div 
                    key={video.id}
                    className={`flex items-center py-3 ${
                      selectedMedia.includes(video.id) ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="pl-2 pr-4">
                      <Checkbox 
                        checked={selectedMedia.includes(video.id)}
                        onCheckedChange={() => handleMediaSelect(video.id)}
                      />
                    </div>
                    
                    <div className="w-16 h-16 rounded overflow-hidden mr-4 bg-blue-100 flex items-center justify-center">
                      <Video className="h-8 w-8 text-blue-500" />
                    </div>
                    
                    <div className="flex-grow">
                      <p className="font-medium">{video.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Video • {video.date}
                      </p>
                    </div>
                    
                    <div className="pr-4">
                      <Button variant="ghost" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
};

export default MediaManager;
