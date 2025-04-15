
import React from 'react';
import { Film, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
  files: File[];
  removeFile: (index: number) => void;
  getFilePreviewUrl: (file: File) => string;
  uploading: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  files,
  removeFile,
  getFilePreviewUrl,
  uploading
}) => {
  return (
    <div className="space-y-4">
      {files.map((file, index) => (
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
    </div>
  );
};

export default FilePreview;
