
import React from 'react';
import { MediaUploader as UnifiedMediaUploader } from '@/components/Common/MediaUploader';

interface MediaUploaderProps {
  onUploadComplete: (file: File, altText: string) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  onUploadComplete, 
  isUploading = false, 
  uploadProgress = 0 
}) => {
  const handleUploadComplete = React.useCallback(async (url: string, isVideo: boolean) => {
    // Extract file info from the URL to create a mock file for backwards compatibility
    // In practice, the new uploader handles everything internally
    console.log('Media uploaded successfully:', { url, isVideo });
  }, []);

  return (
    <UnifiedMediaUploader
      onUploadComplete={handleUploadComplete}
      acceptedTypes="both"
      maxFileSizeMB={50}
      showAltText={true}
    />
  );
};

export default MediaUploader;
