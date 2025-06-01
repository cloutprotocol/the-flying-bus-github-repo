
import { ReaderProfile } from '@/types/ReaderProfile';

const readers: ReaderProfile[] = [
  {
    id: '1',
    username: 'curious_reader',
    display_name: 'Curious Reader',
    email: 'curious@theflyingbus.com',
    role: 'reader',
    bio: 'I love reading articles about science and space!',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    created_at: new Date('2024-02-15').toISOString(),
  },
  {
    id: '2',
    username: 'young_journalist',
    display_name: 'Sam Johnson',
    email: 'sam@theflyingbus.com',
    role: 'author',
    bio: 'Aspiring journalist and science enthusiast.',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    created_at: new Date('2024-01-20').toISOString(),
  },
  {
    id: '3',
    username: 'content_moderator',
    display_name: 'Alex Rodriguez',
    email: 'alex@theflyingbus.com',
    role: 'moderator',
    bio: 'Helping keep The Flying Bus a safe and fun place for young journalists.',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    created_at: new Date('2023-12-10').toISOString(),
  },
  {
    id: '4',
    username: 'admin_user',
    display_name: 'Taylor Smith',
    email: 'taylor@theflyingbus.com',
    role: 'admin',
    bio: 'Editor-in-chief at The Flying Bus.',
    avatar_url: 'https://i.pravatar.cc/150?img=4',
    created_at: new Date('2023-10-05').toISOString(),
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

export const mockReaderProfiles = readers;

export default readers;
