
import { ReaderProfile } from '@/types/ReaderProfile';

const readers: ReaderProfile[] = [
  {
    id: '1',
    username: 'curious_reader',
    displayName: 'Curious Reader',
    email: 'curious@theflyingbus.com',
    role: 'reader',
    bio: 'I love reading articles about science and space!',
    avatar: 'https://i.pravatar.cc/150?img=1',
    joinedDate: new Date('2024-02-15'),
    badges: ['Frequent Commenter', 'Science Enthusiast'],
    readingStreak: 12,
    commentCount: 24,
    achievements: ['First Comment', 'Read 10 Articles', 'Weekly Reader']
  },
  {
    id: '2',
    username: 'young_journalist',
    displayName: 'Sam Johnson',
    email: 'sam@theflyingbus.com',
    role: 'author',
    bio: 'Aspiring journalist and science enthusiast.',
    avatar: 'https://i.pravatar.cc/150?img=2',
    joinedDate: new Date('2024-01-20'),
    badges: ['Top Contributor', 'Story Writer'],
    readingStreak: 30,
    commentCount: 45,
    achievements: ['First Article Published', 'Popular Writer', 'Community Favorite']
  },
  {
    id: '3',
    username: 'content_moderator',
    displayName: 'Alex Rodriguez',
    email: 'alex@theflyingbus.com',
    role: 'moderator',
    bio: 'Helping keep The Flying Bus a safe and fun place for young journalists.',
    avatar: 'https://i.pravatar.cc/150?img=3',
    joinedDate: new Date('2023-12-10'),
    badges: ['Mentor', 'Helpful Guide'],
    readingStreak: 25,
    commentCount: 36,
    achievements: ['Content Guardian', 'Helped 10 Users', 'Quick Responder']
  },
  {
    id: '4',
    username: 'admin_user',
    displayName: 'Taylor Smith',
    email: 'taylor@theflyingbus.com',
    role: 'admin',
    bio: 'Editor-in-chief at The Flying Bus.',
    avatar: 'https://i.pravatar.cc/150?img=4',
    joinedDate: new Date('2023-10-05'),
    badges: ['Editor', 'Lead Contributor'],
    readingStreak: 45,
    commentCount: 52,
    achievements: ['Site Administrator', 'Content Manager', 'Community Leader']
  }
];

export function getReaders(): ReaderProfile[] {
  return readers;
}

export function getReaderByUsername(username: string): ReaderProfile | null {
  return readers.find(reader => reader.username === username) || null;
}

export function getReaderById(id: string): ReaderProfile | null {
  return readers.find(reader => reader.id === id) || null;
}

// Add this new export to resolve the import error in UserList.tsx
export const mockReaderProfiles = readers;

export default readers;
