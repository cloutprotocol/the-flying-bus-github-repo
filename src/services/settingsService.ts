
import { updateUserProfile } from './userService';
import { profileConvexService } from '@/services/convex/profileConvexService';

interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  bio?: string;
  public_bio?: string;
  avatar_url?: string;
  crypto_wallet_address?: string;
  badge_display_preferences?: any;
  favorite_categories?: string[];
}

export async function updateProfile(userId: string, data: ProfileUpdateData) {
  try {
    console.log('Updating profile for user:', userId);
    
    await updateUserProfile(userId, data);
    
    console.log('Profile updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  // Password changes are handled via Convex Auth UI/actions.
  // Expose a thin wrapper for compatibility, but direct callers should migrate.
  console.warn('changePassword is managed by Convex Auth. Invoke via useAuthActions().');
  return { success: false };
}

export async function deleteAccount(userId: string) {
  try {
    console.log('Deleting account for user (Convex profile only):', userId);
    const { success, error } = await profileConvexService.delete(userId);
    if (!success) throw error || new Error('Failed to delete profile');
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
