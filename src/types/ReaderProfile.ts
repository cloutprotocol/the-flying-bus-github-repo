export interface ReaderProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email: string;
  role: 'reader' | 'author' | 'moderator' | 'admin';
  // Add other relevant fields
}
