
import React, { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Film } from 'lucide-react';
import DropZone from './DropZone';
import FilePreview from './FilePreview';
import UploadProgress from './UploadProgress';
import UploadActions from './UploadActions';
import FileTypeInfo from './FileTypeInfo';

interface MediaUploaderProps {
  onUploadComplete: (url: string, isVideo: boolean) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ onUploadComplete }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Handle file submission
  const handleFiles = (files: FileList) => {
    const newFiles: File[] = [];
    
    // Filter files by type
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (uploadType === 'image' && file.type.startsWith('image/')) {
        newFiles.push(file);
      } else if (uploadType === 'video' && file.type.startsWith('video/')) {
        newFiles.push(file);
      }
    }
    
    if (newFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: `Please select a ${uploadType} file.`,
        variant: "destructive"
      });
      return;
    }
    
    setUploadedFiles(newFiles);
  };

  // Helper function to get image URL
  const getFilePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  // Remove a file from the upload list
  const removeFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  // Clear all files
  const clearFiles = () => {
    setUploadedFiles([]);
    setUploadProgress(0);
    setUploadStatus('idle');
  };

  // Handle upload
  const handleUpload = () => {
    if (uploadedFiles.length === 0) return;
    
    setUploading(true);
    setUploadStatus('uploading');
    
    // Simulate file upload with progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setUploading(false);
        setUploadStatus('success');
        
        // In a real app, the server would return the URL
        const fileUrl = getFilePreviewUrl(uploadedFiles[0]);
        
        // Delay to show success state
        setTimeout(() => {
          onUploadComplete(fileUrl, uploadType === 'video');
        }, 1000);
        
        toast({
          title: "Upload complete",
          description: "Your file has been uploaded successfully."
        });
      }
    }, 100);
  };

  const browseFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as 'image' | 'video')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image">
            <Camera className="mr-2 h-4 w-4" />
            Image
          </TabsTrigger>
          <TabsTrigger value="video">
            <Film className="mr-2 h-4 w-4" />
            Video
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {uploadedFiles.length > 0 ? (
        <>
          <FilePreview 
            files={uploadedFiles}
            removeFile={removeFile}
            getFilePreviewUrl={getFilePreviewUrl}
            uploading={uploading}
          />
          
          {uploadStatus === 'uploading' && (
            <UploadProgress progress={uploadProgress} />
          )}
          
          <UploadActions 
            uploadStatus={uploadStatus}
            clearFiles={clearFiles}
            handleUpload={handleUpload}
            uploading={uploading}
          />
        </>
      ) : (
        <DropZone
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          dragActive={dragActive}
          uploadType={uploadType}
          fileInputRef={fileInputRef}
          handleFileInputChange={handleFileInputChange}
          browseFiles={browseFiles}
        />
      )}
      
      <FileTypeInfo uploadType={uploadType} />
    </div>
  );
};

export default MediaUploader;
