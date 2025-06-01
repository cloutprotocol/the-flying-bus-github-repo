
import React, { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Camera, Film, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadMedia } from '@/services/mediaService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface MediaUploaderProps {
  onUploadComplete: (url: string, isVideo: boolean) => void;
  acceptedTypes?: 'image' | 'video' | 'both';
  maxFileSizeMB?: number;
  showAltText?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  previewUrl?: string;
  uploadedUrl?: string;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  onUploadComplete, 
  acceptedTypes = 'both',
  maxFileSizeMB = 50,
  showAltText = true
}) => {
  const [uploadType, setUploadType] = useState<'image' | 'video'>(
    acceptedTypes === 'video' ? 'video' : 'image'
  );
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [altText, setAltText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Helper function to compress images
  const compressImage = useCallback((file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1080 for images)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (uploadType === 'image' && !isImage) {
      return 'Please select an image file';
    }
    if (uploadType === 'video' && !isVideo) {
      return 'Please select a video file';
    }
    
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxFileSizeMB}MB`;
    }
    
    return null;
  }, [uploadType, maxFileSizeMB]);

  // Handle file upload
  const uploadFile = useCallback(async (file: File, index: number) => {
    try {
      logger.info(LogSource.MEDIA, 'Starting file upload', { 
        filename: file.name,
        size: file.size,
        type: file.type
      });

      // Compress images before upload
      let fileToUpload = file;
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) { // Compress if > 1MB
        logger.info(LogSource.MEDIA, 'Compressing image before upload');
        fileToUpload = await compressImage(file);
        logger.info(LogSource.MEDIA, 'Image compressed', { 
          originalSize: file.size,
          compressedSize: fileToUpload.size
        });
      }

      // Update progress to show upload starting
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 10 } : f
      ));

      const { asset, error } = await uploadMedia(fileToUpload, altText);
      
      if (error) {
        throw new Error(error.message || 'Upload failed');
      }
      
      if (!asset) {
        throw new Error('No asset returned from upload');
      }

      // Update to success state
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          progress: 100, 
          status: 'success' as const, 
          uploadedUrl: asset.url 
        } : f
      ));

      logger.info(LogSource.MEDIA, 'File uploaded successfully', { 
        assetId: asset.id,
        url: asset.url
      });

      // Call the completion callback
      setTimeout(() => {
        onUploadComplete(asset.url, uploadType === 'video');
        
        toast({
          title: "Upload successful",
          description: `${uploadType === 'video' ? 'Video' : 'Image'} uploaded successfully`,
        });
      }, 500);

    } catch (error) {
      logger.error(LogSource.MEDIA, 'Upload failed', error);
      
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
  }, [altText, uploadType, compressImage, onUploadComplete, toast]);

  // Handle files
  const handleFiles = useCallback((files: FileList) => {
    const newFiles: UploadingFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        toast({
          title: "Invalid file",
          description: validationError,
          variant: "destructive"
        });
        continue;
      }
      
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      
      newFiles.push({
        file,
        progress: 0,
        status: 'uploading',
        previewUrl
      });
    }
    
    if (newFiles.length === 0) return;
    
    setUploadingFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading files
    newFiles.forEach((_, index) => {
      const actualIndex = uploadingFiles.length + index;
      uploadFile(newFiles[index].file, actualIndex);
    });
  }, [validateFile, uploadingFiles.length, uploadFile, toast]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return newFiles;
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    uploadingFiles.forEach(file => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setUploadingFiles([]);
    setAltText('');
  }, [uploadingFiles]);

  const browseFiles = () => {
    fileInputRef.current?.click();
  };

  const acceptAttribute = uploadType === 'image' ? 'image/*' : 'video/*';

  return (
    <div className="space-y-4">
      {acceptedTypes === 'both' && (
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
      )}

      {showAltText && uploadType === 'image' && (
        <div className="space-y-2">
          <Label htmlFor="alt-text">Alt Text (optional)</Label>
          <Input
            id="alt-text"
            placeholder="Describe the image for accessibility"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />
        </div>
      )}
      
      {uploadingFiles.length === 0 ? (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} 
            transition-colors duration-200 ease-in-out cursor-pointer
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={browseFiles}
        >
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept={acceptAttribute}
            multiple
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
              or click to browse files
            </p>
            
            <Button variant="outline">
              Select {uploadType}
            </Button>
            
            <p className="text-xs text-muted-foreground mt-2">
              Max file size: {maxFileSizeMB}MB. Supported formats: {
                uploadType === 'image' ? 'JPG, PNG, GIF, WEBP' : 'MP4, WEBM, MOV'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {uploadingFiles.map((file, index) => (
            <div key={index} className="relative bg-muted rounded-md p-4">
              <div className="flex items-center gap-3">
                {file.previewUrl ? (
                  <div className="w-16 h-16 rounded overflow-hidden bg-background">
                    <img 
                      src={file.previewUrl} 
                      alt={file.file.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center rounded bg-blue-100">
                    <Film className="h-8 w-8 text-blue-500" />
                  </div>
                )}
                
                <div className="flex-grow space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(index)}
                        disabled={file.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <div className="space-y-1">
                      <Progress value={file.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Uploading... {file.progress}%
                      </p>
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <p className="text-xs text-red-500">{file.error}</p>
                  )}
                  
                  {file.status === 'success' && (
                    <p className="text-xs text-green-600">Upload complete!</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFiles}
            >
              Clear All
            </Button>
            
            <Button
              size="sm"
              onClick={browseFiles}
            >
              Add More
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
