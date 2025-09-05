import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Upload a profile picture and return the public URL
 * This is separate from the media library - profile pictures are stored in a dedicated bucket
 */
export const uploadProfilePicture = async (
  file: File,
  userId: string
): Promise<{ url: string | null, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Starting profile picture upload', {
      filename: file.name,
      size: file.size,
      type: file.type,
      userId
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('Only image files are allowed for profile pictures') };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { url: null, error: new Error('File size must be less than 5MB') };
    }

    // Create a unique path for the profile picture
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `avatars/${userId}/${timestamp}.${fileExt}`;

    logger.info(LogSource.MEDIA, 'Uploading profile picture to storage', { filePath });

    // Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logger.error(LogSource.MEDIA, 'Error uploading profile picture to storage', uploadError);
      return { url: null, error: uploadError };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    logger.info(LogSource.MEDIA, 'Profile picture uploaded successfully', {
      path: filePath,
      url: publicUrl
    });

    return { url: publicUrl, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception uploading profile picture', e);
    return { url: null, error: e };
  }
};

/**
 * Delete old profile picture from storage
 * This helps clean up old profile pictures when a user uploads a new one
 */
export const deleteOldProfilePicture = async (avatarUrl: string): Promise<void> => {
  try {
    // Extract the storage path from the URL
    const urlParts = avatarUrl.split('/');
    const storageIndex = urlParts.findIndex(part => part === 'storage');
    
    if (storageIndex === -1 || storageIndex + 3 >= urlParts.length) {
      // Not a storage URL or invalid format, skip deletion
      return;
    }

    // Extract path after /storage/v1/object/public/media/
    const pathParts = urlParts.slice(storageIndex + 5); // Skip 'storage', 'v1', 'object', 'public', 'media'
    const storagePath = pathParts.join('/');

    // Only delete if it's in the avatars folder to be safe
    if (storagePath.startsWith('avatars/')) {
      logger.info(LogSource.MEDIA, 'Deleting old profile picture', { storagePath });
      
      const { error } = await supabase.storage
        .from('media')
        .remove([storagePath]);

      if (error) {
        logger.error(LogSource.MEDIA, 'Error deleting old profile picture', error);
      } else {
        logger.info(LogSource.MEDIA, 'Old profile picture deleted successfully');
      }
    }
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception deleting old profile picture', e);
  }
};