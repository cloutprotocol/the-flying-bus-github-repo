
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileActivity from './ProfileActivity';
import ProfileBadges from './ProfileBadges';
import { Activity, Award, BookOpen } from 'lucide-react';
import type { ReaderProfile, PrivacySettings } from '@/types/ReaderProfile';

interface ProfileTabsProps {
  profile: ReaderProfile;
  privacySettings: PrivacySettings | null;
}

const ProfileTabs = ({ profile, privacySettings }: ProfileTabsProps) => {
  const tabs = [
    {
      value: 'badges',
      label: 'Badges & Achievements',
      icon: Award,
      show: privacySettings?.show_badges !== false || privacySettings?.show_achievements !== false,
      component: <ProfileBadges profile={profile} privacySettings={privacySettings} />
    },
    {
      value: 'activity',
      label: 'Activity',
      icon: Activity,
      show: privacySettings?.show_reading_activity !== false || privacySettings?.show_comment_history !== false,
      component: <ProfileActivity profile={profile} privacySettings={privacySettings} />
    },
  ];

  const visibleTabs = tabs.filter(tab => tab.show);

  if (visibleTabs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">This profile is set to private.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue={visibleTabs[0]?.value} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      
      {visibleTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-6">
          {tab.component}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ProfileTabs;
