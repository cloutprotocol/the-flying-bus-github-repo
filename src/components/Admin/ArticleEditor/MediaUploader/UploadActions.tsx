
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';

interface UploadActionsProps {
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  clearFiles: () => void;
  handleUpload: () => void;
  uploading: boolean;
}

const UploadActions: React.FC<UploadActionsProps> = ({
  uploadStatus,
  clearFiles,
  handleUpload,
  uploading
}) => {
  return (
    <div>
      {uploadStatus === 'error' && (
        <div className="bg-red-50 text-red-500 p-2 rounded-md flex items-center gap-2 text-sm mb-4">
          <AlertCircle className="h-4 w-4" />
          Upload failed. Please try again.
        </div>
      )}
      
      {uploadStatus === 'success' && (
        <div className="bg-green-50 text-green-500 p-2 rounded-md flex items-center gap-2 text-sm mb-4">
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
  );
};

export default UploadActions;
