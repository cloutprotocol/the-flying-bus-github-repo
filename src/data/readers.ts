
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
    badges: ['Frequent Commenter', 'Science Enthusiast']
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
    badges: ['Top Contributor', 'Story Writer']
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
    badges: ['Mentor', 'Helpful Guide']
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
    badges: ['Editor', 'Lead Contributor']
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

export default readers;
