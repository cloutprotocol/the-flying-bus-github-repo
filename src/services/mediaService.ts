
import { supabase } from '@/integrations/supabase/client';
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
 * Fetch media assets from the database
 * @param {string} filter - Type filter ('all', 'image', 'video')
 * @param {string} search - Search term
 * @returns {Promise<{assets: MediaAsset[], count: number, error: any}>}
 */
export const getMediaAssets = async (
  filter: 'all' | 'image' | 'video' = 'all',
  search: string = ''
): Promise<{ assets: MediaAsset[], count: number, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Fetching media assets', { filter, search });
    
    let query = supabase
      .from('media_assets')
      .select('*', { count: 'exact' });
    
    // Apply filter
    if (filter === 'image') {
      query = query.eq('file_type', 'image');
    } else if (filter === 'video') {
      query = query.eq('file_type', 'video');
    }
    
    // Apply search
    if (search) {
      query = query.or(`filename.ilike.%${search}%,alt_text.ilike.%${search}%`);
    }
    
    // Order by created_at descending
    query = query.order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error(LogSource.MEDIA, 'Error fetching media assets', error);
      return { assets: [], count: 0, error };
    }
    
    // Transform the data into the expected format
    const assets: MediaAsset[] = data.map(item => {
      // Get the public URL for the asset
      const url = supabase.storage
        .from('media')
        .getPublicUrl(item.storage_path).data.publicUrl;
      
      return {
        id: item.id,
        url: url,
        title: item.filename,
        filename: item.filename,
        type: item.file_type,
        date: new Date(item.created_at).toISOString(),
        size: item.size_bytes,
        width: item.width,
        height: item.height,
        duration: item.duration,
        storage_path: item.storage_path,
        mime_type: item.mime_type,
        alt_text: item.alt_text,
        uploader_id: item.uploader_id
      };
    });
    
    logger.info(LogSource.MEDIA, 'Media assets fetched successfully', {
      count: count || 0,
      filter
    });
    
    return { assets, count: count || 0, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception fetching media assets', e);
    return { assets: [], count: 0, error: e };
  }
};

/**
 * Upload a media file to storage
 * @param {File} file - File to upload
 * @param {string} altText - Alternative text for the image
 * @returns {Promise<{asset: MediaAsset | null, error: any}>}
 */
export const uploadMedia = async (
  file: File,
  altText: string = ''
): Promise<{ asset: MediaAsset | null, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Uploading media', {
      filename: file.name,
      size: file.size,
      type: file.type
    });
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return { asset: null, error: new Error('Authentication required') };
    }
    
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'other';
    
    // Create a unique path for the file
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${fileType}s/${userId}/${timestamp}_${file.name}`;
    
    // Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      logger.error(LogSource.MEDIA, 'Error uploading to storage', uploadError);
      return { asset: null, error: uploadError };
    }
    
    // Get dimensions for images
    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;
    
    if (fileType === 'image') {
      // We would need to use something like createImageBitmap or HTML Image to get dimensions
      // For now, we'll leave them undefined
    }
    
    // Insert record into media_assets table
    const { data: assetData, error: insertError } = await supabase
      .from('media_assets')
      .insert({
        filename: file.name,
        file_type: fileType,
        storage_path: filePath,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: altText,
        uploader_id: userId,
        width: width,
        height: height,
        duration: duration
      })
      .select()
      .single();
    
    if (insertError) {
      logger.error(LogSource.MEDIA, 'Error inserting media record', insertError);
      // Try to clean up the uploaded file
      await supabase.storage.from('media').remove([filePath]);
      return { asset: null, error: insertError };
    }
    
    // Get the public URL
    const url = supabase.storage
      .from('media')
      .getPublicUrl(filePath).data.publicUrl;
    
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
      path: filePath
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
    const { data: asset, error: fetchError } = await supabase
      .from('media_assets')
      .select('storage_path')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      logger.error(LogSource.MEDIA, 'Error fetching asset for deletion', fetchError);
      return { success: false, error: fetchError };
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('media')
      .remove([asset.storage_path]);
    
    if (storageError) {
      logger.error(LogSource.MEDIA, 'Error deleting from storage', storageError);
      return { success: false, error: storageError };
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);
    
    if (dbError) {
      logger.error(LogSource.MEDIA, 'Error deleting from database', dbError);
      return { success: false, error: dbError };
    }
    
    logger.info(LogSource.MEDIA, 'Media asset deleted successfully', { id });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception deleting media asset', e);
    return { success: false, error: e };
  }
};

/**
 * Update a media asset's metadata
 * @param {string} id - Asset ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{asset: MediaAsset | null, error: any}>}
 */
export const updateMediaMetadata = async (
  id: string,
  updates: { title?: string; alt_text?: string }
): Promise<{ asset: MediaAsset | null, error: any }> => {
  try {
    logger.info(LogSource.MEDIA, 'Updating media metadata', { id, updates });
    
    const { data: updated, error } = await supabase
      .from('media_assets')
      .update({
        filename: updates.title,
        alt_text: updates.alt_text
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error(LogSource.MEDIA, 'Error updating media metadata', error);
      return { asset: null, error };
    }
    
    // Get the public URL
    const url = supabase.storage
      .from('media')
      .getPublicUrl(updated.storage_path).data.publicUrl;
    
    const asset: MediaAsset = {
      id: updated.id,
      url,
      title: updated.filename,
      filename: updated.filename,
      type: updated.file_type,
      date: new Date(updated.created_at).toISOString(),
      size: updated.size_bytes,
      width: updated.width,
      height: updated.height,
      duration: updated.duration,
      storage_path: updated.storage_path,
      mime_type: updated.mime_type,
      alt_text: updated.alt_text,
      uploader_id: updated.uploader_id
    };
    
    logger.info(LogSource.MEDIA, 'Media metadata updated successfully', { id });
    return { asset, error: null };
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception updating media metadata', e);
    return { asset: null, error: e };
  }
};
