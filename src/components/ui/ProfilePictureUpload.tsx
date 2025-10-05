import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Loader2 } from 'lucide-react';
import { uploadProfilePicture, deleteOldProfilePicture } from '@/services/profilePictureService';
import { useToast } from '@/hooks/use-toast';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  displayName?: string;
  userId: string;
  onUploadSuccess: (newAvatarUrl: string) => void;
  className?: string;
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentAvatarUrl,
  displayName,
  userId,
  onUploadSuccess,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Upload the new profile picture
      const { url, error } = await uploadProfilePicture(file, userId);

      if (error) {
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload profile picture. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!url) {
        toast({
          title: "Upload failed",
          description: "Failed to get the uploaded image URL. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Delete old profile picture if it exists and is from our storage
      if (currentAvatarUrl && currentAvatarUrl.includes('/storage/')) {
        await deleteOldProfilePicture(currentAvatarUrl);
      }

      // Call the success callback with the new URL
      onUploadSuccess(url);

      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Avatar className="h-20 w-20">
        <AvatarImage src={currentAvatarUrl} alt={displayName} />
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg">
          {getInitials(displayName || 'User')}
        </AvatarFallback>
      </Avatar>
      
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? 'Uploading...' : 'Upload Picture'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          JPG, PNG or GIF. Max size 5MB.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePictureUpload;