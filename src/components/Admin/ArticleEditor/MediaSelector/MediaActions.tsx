
import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Upload, FolderOpen } from 'lucide-react';
import MediaGalleryDialog from './MediaGalleryDialog';

interface MediaActionsProps {
  showMediaDialog: boolean;
  setShowMediaDialog: (show: boolean) => void;
  onSelectMedia: (url: string, isVideo: boolean) => void;
}

const MediaActions: React.FC<MediaActionsProps> = ({
  showMediaDialog,
  setShowMediaDialog,
  onSelectMedia
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MediaGalleryDialog 
          open={showMediaDialog} 
          onOpenChange={setShowMediaDialog}
          onSelectMedia={onSelectMedia}
        />
        
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
    </>
  );
};

export default MediaActions;
