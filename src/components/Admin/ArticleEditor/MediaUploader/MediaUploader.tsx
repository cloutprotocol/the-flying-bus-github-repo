
import React from 'react';
import { MediaUploader as UnifiedMediaUploader } from '@/components/Common/MediaUploader';

interface MediaUploaderProps {
  onUploadComplete: (url: string, isVideo: boolean) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ onUploadComplete }) => {
  return (
    <UnifiedMediaUploader
      onUploadComplete={onUploadComplete}
      acceptedTypes="both"
      maxFileSizeMB={50}
      showAltText={true}
    />
  );
};

export default MediaUploader;
