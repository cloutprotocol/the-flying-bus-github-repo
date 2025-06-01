
import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';

export interface UserSearchFilters {
  searchTerm?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

export interface UserUpdateData {
  username?: string;
  display_name?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
}

export async function fetchAllUsers(filters: UserSearchFilters = {}) {
  const { searchTerm, role, limit = 50, offset = 0 } = filters;
  
  console.log('Fetching users with filters:', filters);
  
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    console.log('Executing user query...');
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error fetching users:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`Successfully fetched ${data?.length || 0} users`);

    // Transform database format to ReaderProfile format
    const users: ReaderProfile[] = data?.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      role: user.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: user.bio || '',
      avatar: user.avatar_url || '',
      joinedDate: new Date(user.created_at),
    })) || [];

    return { users, totalCount: count || 0 };
  } catch (error) {
    console.error('Exception in fetchAllUsers:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    throw new Error('Failed to fetch users: Unknown error');
  }
}

export async function updateUserProfile(userId: string, data: UserUpdateData) {
  console.log('Updating user profile:', userId, data);
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
    
    console.log('Successfully updated user profile');
  } catch (error) {
    console.error('Exception updating user profile:', error);
    throw error;
  }
}

export async function updateUserRole(userId: string, role: string) {
  console.log('Updating user role:', userId, role);
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      throw new Error(`Failed to update role: ${error.message}`);
    }
    
    console.log('Successfully updated user role');
  } catch (error) {
    console.error('Exception updating user role:', error);
    throw error;
  }
}

export async function getUserStatistics(userId: string) {
  console.log('Fetching user statistics for:', userId);
  
  try {
    // Fetch comment count
    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Fetch reading stats
    const { data: readingStats } = await supabase
      .from('user_reading_stats')
      .select('reading_streak, articles_read')
      .eq('user_id', userId)
      .single();

    // Fetch achievements
    const { count: achievementCount } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const stats = {
      commentCount: commentCount || 0,
      readingStreak: readingStats?.reading_streak || 0,
      articlesRead: readingStats?.articles_read || 0,
      achievements: achievementCount || 0,
    };
    
    console.log('Successfully fetched user statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Exception fetching user statistics:', error);
    throw error;
  }
}
