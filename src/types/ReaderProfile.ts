
export interface ReaderProfile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  role: string;
  avatar: string;
  bio?: string;
  public_bio?: string;
  crypto_wallet_address?: string;
  badge_display_preferences?: any;
  favorite_categories?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PrivacySettings {
  user_id: string;
  profile_visibility: 'public' | 'private';
  show_reading_activity: boolean;
  show_comment_history: boolean;
  show_badges: boolean;
  show_achievements: boolean;
  updated_at: string;
}

export interface UserReadingStats {
  user_id: string;
  articles_read: number;
  reading_streak: number;
  last_read_date: string | null;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_name: string;
  achieved_at: string;
}

export interface AchievementType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  created_at: string;
}
