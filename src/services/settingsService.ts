
import { supabase } from '@/integrations/supabase/client';
import { updateUserProfile } from './userService';

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
  try {
    console.log('Attempting to change password');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('User not found');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    console.log('Password changed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

export async function deleteAccount(userId: string) {
  try {
    console.log('Deleting account for user:', userId);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.warn('Could not delete auth user (may require admin privileges):', authError);
    }

    console.log('Account deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
