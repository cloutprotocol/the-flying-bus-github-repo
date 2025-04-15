
import React from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import ProfileHeader from './ProfileHeader';
import ProfileInfo from './ProfileInfo';
import ProfileTabs from './ProfileTabs';
import { CommentProps } from '@/components/Comments/CommentItem';

// Mock comment data for the profile
const mockReaderComments: CommentProps[] = [
  {
    id: 'comment-1',
    author: {
      name: 'Curious Reader',
      avatar: '/avatar-placeholder.png',
      badges: ['Reader']
    },
    content: 'This article was really informative! I learned so much about climate change.',
    createdAt: new Date('2023-10-15T10:30:00'),
    likes: 5,
    articleTitle: 'Understanding Climate Change',
    articleUrl: '/headliners/understanding-climate-change'
  },
  {
    id: 'comment-2',
    author: {
      name: 'Curious Reader',
      avatar: '/avatar-placeholder.png',
      badges: ['Reader']
    },
    content: 'I disagree with some points in this article. I think we need more evidence.',
    createdAt: new Date('2023-10-10T14:20:00'),
    likes: 2,
    articleTitle: 'The Future of Renewable Energy',
    articleUrl: '/debates/future-of-renewable-energy'
  }
];

interface ReaderProfilePageProps {
  profile: ReaderProfile;
  isOwnProfile: boolean;
}

const ReaderProfilePage: React.FC<ReaderProfilePageProps> = ({ profile, isOwnProfile }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <ProfileHeader reader={profile} isOwnProfile={isOwnProfile} />
      <ProfileInfo reader={profile} />
      <ProfileTabs reader={profile} readerComments={mockReaderComments} />
    </div>
  );
};

export default ReaderProfilePage;
