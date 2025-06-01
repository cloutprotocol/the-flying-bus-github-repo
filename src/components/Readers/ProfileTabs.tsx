
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileActivityTab from './ProfileActivityTab';
import ProfileCommentsTab from './ProfileCommentsTab';
import ProfileAchievementsTab from './ProfileAchievementsTab';
import { ReaderProfile } from '@/types/ReaderProfile';
import { CommentProps } from '@/components/Comments/CommentItem';

interface ProfileTabsProps {
  reader: ReaderProfile;
  readerComments: CommentProps[];
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ reader, readerComments }) => {
  return (
    <div className="px-4 mt-10">
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-8 bg-gray-100 p-1 rounded-full">
          <TabsTrigger 
            value="activity" 
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-purple-700"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger 
            value="comments" 
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-purple-700"
          >
            Comments
          </TabsTrigger>
          <TabsTrigger 
            value="achievements" 
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-purple-700" 
          >
            Achievements
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity">
          <ProfileActivityTab reader={reader} />
        </TabsContent>
        
        <TabsContent value="comments">
          <ProfileCommentsTab comments={readerComments} />
        </TabsContent>
        
        <TabsContent value="achievements">
          <ProfileAchievementsTab achievements={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileTabs;
