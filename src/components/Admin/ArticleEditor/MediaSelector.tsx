
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Image, Upload, X, ExternalLink, Camera, Film, Gallery } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MediaGallery from './MediaGallery';
import MediaUploader from './MediaUploader';
import VideoPlayer from '@/components/Articles/VideoPlayer';

interface MediaSelectorProps {
  form: UseFormReturn<any>;
}

const MediaSelector: React.FC<MediaSelectorProps> = ({ form }) => {
  const [previewMedia, setPreviewMedia] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  
  const handleMediaSelect = (url: string, isVideoFile: boolean = false) => {
    setPreviewMedia(url);
    setIsVideo(isVideoFile);
    
    if (isVideoFile) {
      form.setValue('videoUrl', url);
    } else {
      form.setValue('imageUrl', url);
    }
    
    setShowMediaDialog(false);
  };
  
  const handleRemoveMedia = () => {
    setPreviewMedia('');
    setIsVideo(false);
    form.setValue('imageUrl', '');
    form.setValue('videoUrl', '');
  };
  
  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreviewMedia(url);
    
    // Simple check to determine if it's a video URL
    const isVideoUrl = url.includes('youtube.com') || 
                      url.includes('youtu.be') || 
                      url.includes('vimeo.com') ||
                      url.endsWith('.mp4');
    
    setIsVideo(isVideoUrl);
    
    if (isVideoUrl) {
      form.setValue('videoUrl', url);
      form.setValue('imageUrl', '');
    } else {
      form.setValue('imageUrl', url);
      form.setValue('videoUrl', '');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={isVideo ? 'videoUrl' : 'imageUrl'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Media URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter media URL" 
                  value={previewMedia}
                  onChange={handleUrlInputChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Media preview */}
        {previewMedia ? (
          <div className="rounded-md overflow-hidden border bg-muted relative">
            <button 
              onClick={handleRemoveMedia}
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
                  onError={() => setPreviewMedia('')}
                />
              </AspectRatio>
            )}
          </div>
        ) : (
          <div className="rounded-md overflow-hidden border bg-muted flex items-center justify-center h-[150px]">
            <div className="text-center text-muted-foreground">
              <Image className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm">Media preview</p>
            </div>
          </div>
        )}
        
        {/* Open media gallery dialog */}
        <div className="grid grid-cols-2 gap-3">
          <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" type="button">
                <Gallery className="mr-2 h-4 w-4" />
                Media Gallery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Media Gallery</DialogTitle>
                <DialogDescription>
                  Select media from your gallery or upload new files
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="gallery" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gallery">
                    <Gallery className="mr-2 h-4 w-4" />
                    Gallery
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="gallery" className="border rounded-md p-4 mt-4">
                  <MediaGallery onSelectMedia={handleMediaSelect} />
                </TabsContent>
                <TabsContent value="upload" className="border rounded-md p-4 mt-4">
                  <MediaUploader onUploadComplete={handleMediaSelect} />
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            className="w-full" 
            type="button"
            onClick={() => setShowMediaDialog(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Media
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p className="flex items-center">
            <ExternalLink className="h-3 w-3 mr-1" /> 
            You can also paste a direct URL to an image or video
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaSelector;
