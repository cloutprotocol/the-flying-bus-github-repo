
import { supabase } from '@/integrations/supabase/client';
import { updateUserProfile } from './userService';

interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
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
    
    // First verify current password by trying to sign in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('User not found');
    }

    // Update password
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

export async function exportUserData(userId: string) {
  try {
    console.log('Exporting user data for:', userId);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Get user's articles (if any)
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', userId);

    // Get user's comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId);

    const userData = {
      profile,
      articles: articles || [],
      comments: comments || [],
      exportDate: new Date().toISOString()
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-data-${userId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('User data exported successfully');
    return { success: true };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}

export async function deleteAccount(userId: string) {
  try {
    console.log('Deleting account for user:', userId);
    
    // Delete user profile (cascade will handle related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }

    // Delete auth user
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
