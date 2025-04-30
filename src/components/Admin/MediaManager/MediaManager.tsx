
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
import MediaUploader from './MediaUpload/MediaUploader';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import useMediaManager from '@/hooks/useMediaManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const MediaManager = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  const { 
    media, 
    loading, 
    filter, 
    setFilter, 
    searchTerm, 
    setSearchTerm,
    totalCount,
    handleUpload,
    handleDelete,
    isUploading,
    uploadProgress
  } = useMediaManager();
  
  const handleMediaSelect = (id: string) => {
    if (selectedMedia.includes(id)) {
      setSelectedMedia(selectedMedia.filter(mediaId => mediaId !== id));
    } else {
      setSelectedMedia([...selectedMedia, id]);
    }
  };
  
  const handleMediaUpload = async (file: File, altText: string) => {
    logger.info(LogSource.MEDIA, 'Handling media upload', { 
      filename: file.name,
      size: file.size,
      type: file.type
    });
    
    const asset = await handleUpload(file, altText);
    if (asset) {
      setUploadOpen(false);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedMedia.length === media.length) {
      setSelectedMedia([]);
    } else {
      setSelectedMedia(media.map(item => item.id));
    }
  };
  
  const handleDeselectAll = () => {
    setSelectedMedia([]);
  };
  
  const handleDeleteSelected = async () => {
    // Delete each selected media item
    const promises = selectedMedia.map(id => handleDelete(id));
    await Promise.all(promises);
    setSelectedMedia([]);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
  };
  
  const handleFilterChange = (newFilter: 'all' | 'image' | 'video') => {
    setFilter(newFilter);
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
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Media
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Input
              placeholder="Search media files..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full"
            />
            <Button type="submit" variant="ghost" size="sm" className="absolute right-0 top-0 h-full">
              Search
            </Button>
          </form>
          
          <MediaToolbar 
            viewMode={viewMode} 
            setViewMode={setViewMode} 
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
          />
        </div>
        
        <Tabs defaultValue={filter} onValueChange={(value) => handleFilterChange(value as 'all' | 'image' | 'video')}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 mb-4">
            <TabsList>
              <TabsTrigger value="all">
                <FolderOpen className="mr-2 h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="image">
                <Image className="mr-2 h-4 w-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="video">
                <Video className="mr-2 h-4 w-4" />
                Videos
              </TabsTrigger>
            </TabsList>
          </div>
          
          {filterOpen && <FilterPanel />}
          
          {selectedMedia.length > 0 && (
            <SelectionToolbar 
              selectedCount={selectedMedia.length}
              onDeselectAll={handleDeselectAll}
              onDeleteSelected={handleDeleteSelected}
            />
          )}
          
          <TabsContent value={filter}>
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading media assets...</p>
              </div>
            ) : media.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No media assets found. Try uploading some!</p>
              </div>
            ) : viewMode === 'grid' ? (
              <MediaGrid 
                media={media} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            ) : (
              <MediaList 
                media={media} 
                selectedMedia={selectedMedia}
                onMediaSelect={handleMediaSelect}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Upload images or videos to your media library
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <MediaUploader 
              onUploadComplete={handleMediaUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AdminPortalLayout>
  );
};

export default MediaManager;
