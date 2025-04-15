
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Image, 
  Upload, 
  Camera, 
  Film, 
  Check, 
  AlertCircle,
  Trash
} from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      
      {/* Drag & Drop area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} 
          transition-colors duration-200 ease-in-out
          ${uploadStatus === 'uploading' ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploadedFiles.length > 0 ? (
          <div className="space-y-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative bg-muted rounded-md p-2 flex items-center gap-3">
                {file.type.startsWith('image/') ? (
                  <div className="w-16 h-16 rounded overflow-hidden bg-background">
                    <img 
                      src={getFilePreviewUrl(file)} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center rounded bg-blue-100">
                    <Film className="h-8 w-8 text-blue-500" />
                  </div>
                )}
                
                <div className="flex-grow">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {uploadStatus === 'uploading' && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2 w-full" />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
            
            {uploadStatus === 'error' && (
              <div className="bg-red-50 text-red-500 p-2 rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                Upload failed. Please try again.
              </div>
            )}
            
            {uploadStatus === 'success' && (
              <div className="bg-green-50 text-green-500 p-2 rounded-md flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" />
                Upload complete!
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFiles}
                disabled={uploading}
              >
                Clear
              </Button>
              
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={uploading || uploadStatus === 'success'}
              >
                {uploadStatus === 'success' ? 'Uploaded' : 'Upload'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept={uploadType === 'image' ? 'image/*' : 'video/*'}
              className="hidden"
            />
            
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
              onClick={() => fileInputRef.current?.click()}
            >
              Select {uploadType}
            </Button>
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>Max file size: 10MB. Supported formats: {uploadType === 'image' ? 'JPG, PNG, GIF' : 'MP4, WEBM, MOV'}</p>
      </div>
    </div>
  );
};

export default MediaUploader;
