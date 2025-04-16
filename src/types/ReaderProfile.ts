
export interface ReaderProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'reader' | 'author' | 'moderator' | 'admin';
  bio?: string;
  avatar: string;
  joinedDate: Date;
  badges?: string[];
  // Add missing properties
  readingStreak?: number;
  commentCount?: number;
  achievements?: string[];
}
