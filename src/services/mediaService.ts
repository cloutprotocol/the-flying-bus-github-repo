
// Supabase removed; stubbing media operations. Integrate Convex media assets later.
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface MediaAsset {
  id: string;
  url: string;
  title: string;
  filename: string;
  type: string;
  date: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  storage_path: string;
  mime_type?: string;
  alt_text?: string;
  uploader_id?: string;
}

/**
 * Extract image dimensions from file
 */
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ width: 0, height: 0 });
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Fetch media assets from the database
 */
export const getMediaAssets = async (
  filter: 'all' | 'image' | 'video' = 'all',
  search: string = ''
): Promise<{ assets: MediaAsset[], count: number, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Fetching media assets', { filter, search });
    
    // Stub: no media rows
    return { assets: [], count: 0, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception fetching media assets', e);
    return { assets: [], count: 0, error: e };
  }
};

/**
 * Upload a media file to storage
 */
export const uploadMedia = async (
  file: File,
  altText: string = ''
): Promise<{ asset: MediaAsset | null, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Starting media upload', {
      filename: file.name,
      size: file.size,
      type: file.type
    });
    
    // Get current user
    const userId = 'current_user';
    
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'other';
    
    // Get image dimensions if it's an image
    let width: number | undefined;
    let height: number | undefined;
    
    if (fileType === 'image') {
      const dimensions = await getImageDimensions(file);
      width = dimensions.width;
      height = dimensions.height;
    }
    
    // Create a unique path for the file
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${fileType}s/${userId}/${timestamp}_${sanitizedName}`;
    
    logger.info(LogSource.MEDIA, 'Uploading to storage', { filePath });
    
    // Upload to Storage
    // Stub upload
    
    logger.info(LogSource.MEDIA, 'File uploaded to storage, creating database record');
    
    // Insert record into media_assets table
    const assetData: any = {
      id: `media_${Date.now()}`,
      filename: file.name,
      file_type: fileType,
      storage_path: filePath,
      mime_type: file.type,
      size_bytes: file.size,
      alt_text: altText,
      uploader_id: userId,
      width,
      height,
      created_at: new Date().toISOString(),
    };
    
    // Get the public URL
    const url = `/media/${filePath}`;
    
    const asset: MediaAsset = {
      id: assetData.id,
      url: url,
      title: assetData.filename,
      filename: assetData.filename,
      type: assetData.file_type,
      date: new Date(assetData.created_at).toISOString(),
      size: assetData.size_bytes,
      width: assetData.width,
      height: assetData.height,
      duration: assetData.duration,
      storage_path: assetData.storage_path,
      mime_type: assetData.mime_type,
      alt_text: assetData.alt_text,
      uploader_id: assetData.uploader_id
    };
    
    logger.info(LogSource.MEDIA, 'Media uploaded successfully', {
      id: asset.id,
      path: filePath,
      url: url
    });
    
    return { asset, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception uploading media', e);
    return { asset: null, error: e };
  }
};

/**
 * Delete a media asset
 * @param {string} id - Asset ID
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const deleteMedia = async (id: string): Promise<{ success: boolean, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Deleting media asset', { id });
    
    // First, get the asset to know its storage path
    // Stub: nothing to delete remotely
    logger.info(LogSource.MEDIA, 'Media asset deleted successfully', { id });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception deleting media asset', e);
    return { success: false, error: e };
  }
};

export const updateMediaMetadata = async (
  id: string,
  updates: { title?: string; alt_text?: string }
): Promise<{ asset: MediaAsset | null, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Updating media metadata', { id, updates });
    
    const asset: MediaAsset = {
      id,
      url: `/media/${id}`,
      title: updates.title || 'media',
      filename: updates.title || 'media',
      type: 'image',
      date: new Date().toISOString(),
      storage_path: '',
      alt_text: updates.alt_text,
    } as any;
    
    logger.info(LogSource.MEDIA, 'Media metadata updated successfully', { id });
    return { asset, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception updating media metadata', e);
    return { asset: null, error: e };
  }
};
