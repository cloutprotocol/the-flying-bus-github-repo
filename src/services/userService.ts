import { profileConvexService } from '@/services/convex/profileConvexService';
import { commentConvexService } from '@/services/convex/commentConvexService';
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
  const page = Math.floor(offset / limit) + 1;

  console.log('Fetching users from Convex with filters:', filters);

  try {
    const { profiles, count, error } = await profileConvexService.getAll(page, limit, searchTerm, role);

    if (error) {
      console.error('Convex error fetching users:', error);
      throw new Error(`Database error: ${error}`);
    }

    console.log(`Successfully fetched ${profiles?.length || 0} users`);

    // Transform database format to ReaderProfile format
    const users: ReaderProfile[] = profiles?.map(user => ({
      id: user._id,
      username: user.username || '',
      display_name: user.display_name || '',
      email: user.email,
      role: user.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: user.bio || '',
      avatar_url: user.avatar_url || '',
      created_at: user.created_at,
      updated_at: user.updated_at,
      public_bio: user.public_bio,
      crypto_wallet_address: user.crypto_wallet_address,
      badge_display_preferences: user.badge_display_preferences,
      favorite_categories: user.favorite_categories || undefined,
    })) || [];

    return { users, totalCount: count || 0 };
  } catch (error) {
    console.error('Exception in fetchAllUsers:', error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, updates: UserUpdateData) {
  console.log('Updating user profile in Convex:', userId, updates);

  try {
    const { data, error } = await profileConvexService.update(userId, updates);

    if (error) {
      console.error('Convex error updating user:', error);
      throw new Error(`Database error: ${error}`);
    }

    if (!data) {
      throw new Error('User not found or no changes made');
    }

    // Fetch the updated profile to return the full object as expected
    const { profile } = await profileConvexService.getById(userId);

    // Map to the expected format if needed, but the caller might expect the raw data or ReaderProfile
    // The original code returned `data[0]` from supabase update which is the full record.
    // profileConvexService.update returns { _id, ...updates }, so we fetch full to be safe.

    if (!profile) return data; // Fallback

    const mappedProfile: ReaderProfile = {
      id: profile._id,
      username: profile.username || '',
      display_name: profile.display_name || '',
      email: profile.email,
      role: profile.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      public_bio: profile.public_bio,
      crypto_wallet_address: profile.crypto_wallet_address,
      badge_display_preferences: profile.badge_display_preferences,
      favorite_categories: profile.favorite_categories || undefined,
    };

    console.log('User profile updated successfully:', mappedProfile);
    return mappedProfile;
  } catch (error) {
    console.error('Exception in updateUserProfile:', error);
    throw error;
  }
}

export async function getUserStatistics(userId: string): Promise<UserStatistics> {
  try {
    console.log('Fetching user statistics from Convex for:', userId);

    // Get comment count using Convex service
    const { comments, error } = await commentConvexService.getByUser(userId);

    if (error) {
      console.error('Error fetching comments for stats:', error);
    }

    const commentCount = comments ? comments.length : 0;

    // TODO: Implement reading stats and achievements in Convex
    // These tables (user_reading_stats, user_achievements) are not yet in Convex schema.
    // Returning 0 for now as per migration plan phase 1.
    const readingStreak = 0;
    const articlesRead = 0;
    const achievements = 0;

    return {
      commentCount,
      readingStreak,
      articlesRead,
      achievements,
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
