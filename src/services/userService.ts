
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

export interface UserStatistics {
  commentCount: number;
  readingStreak: number;
  articlesRead: number;
  achievements: number;
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
      display_name: user.display_name,
      email: user.email,
      role: user.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: user.bio || '',
      avatar_url: user.avatar_url || '',
      created_at: user.created_at,
      updated_at: user.updated_at,
      public_bio: user.public_bio,
      crypto_wallet_address: user.crypto_wallet_address,
      badge_display_preferences: user.badge_display_preferences,
      favorite_categories: user.favorite_categories,
    })) || [];

    return { users, totalCount: count || 0 };
  } catch (error) {
    console.error('Exception in fetchAllUsers:', error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, updates: UserUpdateData) {
  console.log('Updating user profile:', userId, updates);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating user:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('User profile updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in updateUserProfile:', error);
    throw error;
  }
}

export async function getUserStatistics(userId: string): Promise<UserStatistics> {
  try {
    console.log('Fetching user statistics for:', userId);
    
    // Get comment count
    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get reading stats
    const { data: readingStats } = await supabase
      .from('user_reading_stats')
      .select('articles_read, reading_streak')
      .eq('user_id', userId)
      .single();

    // Get achievements count
    const { count: achievementsCount } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      commentCount: commentCount || 0,
      readingStreak: readingStats?.reading_streak || 0,
      articlesRead: readingStats?.articles_read || 0,
      achievements: achievementsCount || 0,
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return {
      commentCount: 0,
      readingStreak: 0,
      articlesRead: 0,
      achievements: 0,
    };
  }
}
