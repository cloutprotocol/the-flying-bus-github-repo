
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Film, Upload, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MediaUploaderProps {
  onUploadComplete: (file: File, altText: string) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  onUploadComplete,
  isUploading = false,
  uploadProgress = 0
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Process the files
  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (uploadType === 'image' && !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (uploadType === 'video' && !file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onUploadComplete(selectedFile, altText);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setAltText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
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
      
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {!selectedFile ? (
          <div 
            className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={uploadType === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">
                Drag and drop a {uploadType} file, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: {uploadType === 'image' ? 'JPG, PNG, GIF, WEBP' : 'MP4, WEBM, MOV'}
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-md p-4 relative">
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 h-6 w-6" 
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                {uploadType === 'image' && selectedFile ? (
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Preview" 
                    className="h-full w-full object-cover rounded"
                  />
                ) : (
                  <Film className="h-8 w-8 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="alt-text" className="text-sm">
                Alt Text {uploadType === 'image' ? '(recommended for accessibility)' : '(optional)'}
              </Label>
              <Textarea
                id="alt-text"
                placeholder={`Describe this ${uploadType}...`}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        )}
        
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-center text-gray-500">Uploading... {uploadProgress}%</p>
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setSelectedFile(null)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MediaUploader;
