
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import MediaUrlInput from './MediaUrlInput';
import MediaPreview from './MediaPreview';
import MediaActions from './MediaActions';

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
        <MediaUrlInput 
          form={form} 
          previewMedia={previewMedia} 
          isVideo={isVideo} 
          onChange={handleUrlInputChange} 
        />
        
        <MediaPreview 
          previewMedia={previewMedia} 
          isVideo={isVideo} 
          onRemove={handleRemoveMedia} 
        />
        
        <MediaActions 
          showMediaDialog={showMediaDialog}
          setShowMediaDialog={setShowMediaDialog}
          onSelectMedia={handleMediaSelect}
        />
      </CardContent>
    </Card>
  );
};

export default MediaSelector;
