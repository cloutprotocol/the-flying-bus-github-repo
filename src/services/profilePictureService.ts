import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

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

    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

    // 1) Generate upload URL
    const uploadUrl = await convex.mutation(api.media.generateUploadUrl, {});

    // 2) Upload file to Convex Storage
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      return { url: null, error: new Error(`Upload failed: ${uploadRes.status} ${text}`) };
    }
    const { storageId } = await uploadRes.json();

    // 3) Save metadata and get a URL
    const saved = await convex.mutation(api.media.saveMediaAsset, {
      storageId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      fileType: 'image',
    } as any);

    const publicUrl = saved.url as string;

    // 4) Update profile avatar_url if we have a profile id
    try {
      await convex.mutation(api.profiles.update, {
        id: userId as unknown as Id<'profiles'>,
        avatar_url: publicUrl,
      } as any);
    } catch (e) {
      // Non-fatal: avatar can still be set elsewhere
      logger.warn(LogSource.MEDIA, 'Could not update profile avatar_url after upload', e as any);
    }

    logger.info(LogSource.MEDIA, 'Profile picture uploaded via Convex', { path: filePath });
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
    logger.info(LogSource.MEDIA, 'Delete old profile picture requested (not implemented)', { avatarUrl });
  } catch (e) {
    logger.error(LogSource.MEDIA, 'Exception deleting old profile picture', e);
  }
};
