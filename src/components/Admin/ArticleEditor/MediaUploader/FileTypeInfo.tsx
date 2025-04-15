
import React from 'react';

interface FileTypeInfoProps {
  uploadType: 'image' | 'video';
}

const FileTypeInfo: React.FC<FileTypeInfoProps> = ({ uploadType }) => {
  return (
    <div className="text-xs text-muted-foreground">
      <p>Max file size: 10MB. Supported formats: {uploadType === 'image' ? 'JPG, PNG, GIF' : 'MP4, WEBM, MOV'}</p>
    </div>
  );
};

export default FileTypeInfo;
