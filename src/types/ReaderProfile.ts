
export interface ReaderProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email: string;
  role: 'reader' | 'author' | 'moderator' | 'admin';
  
  // Additional profile fields
  bio?: string;
  joinedDate?: Date;
  commentCount?: number;
  badges?: string[];
  achievements?: string[];
  readingStreak?: number;
}

export interface PrivacySettings {
  showCommentHistory: boolean;
  showReadingActivity: boolean;
  profileVisibility: 'public' | 'private';
}
