
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  dragActive: boolean;
  uploadType: 'image' | 'video';
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  browseFiles: () => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  handleDrag,
  handleDrop,
  dragActive,
  uploadType,
  fileInputRef,
  handleFileInputChange,
  browseFiles
}) => {
  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-6 
        ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} 
        transition-colors duration-200 ease-in-out
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={uploadType === 'image' ? 'image/*' : 'video/*'}
        className="hidden"
      />
      
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-medium mb-1">
          Drop your {uploadType} here
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>
        
        <Button 
          variant="outline" 
          onClick={browseFiles}
        >
          Select {uploadType}
        </Button>
      </div>
    </div>
  );
};

export default DropZone;
