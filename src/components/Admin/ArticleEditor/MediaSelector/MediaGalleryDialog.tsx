
import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Upload } from 'lucide-react';
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
import MediaGallery from '@/components/Admin/ArticleEditor/MediaGallery';
import MediaUploader from '@/components/Admin/ArticleEditor/MediaUploader';

interface MediaGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMedia: (url: string, isVideo: boolean) => void;
}

const MediaGalleryDialog: React.FC<MediaGalleryDialogProps> = ({
  open,
  onOpenChange,
  onSelectMedia
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" type="button">
          <FolderOpen className="mr-2 h-4 w-4" />
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
              <FolderOpen className="mr-2 h-4 w-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="gallery" className="border rounded-md p-4 mt-4">
            <MediaGallery onSelectMedia={onSelectMedia} />
          </TabsContent>
          <TabsContent value="upload" className="border rounded-md p-4 mt-4">
            <MediaUploader onUploadComplete={onSelectMedia} />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaGalleryDialog;
