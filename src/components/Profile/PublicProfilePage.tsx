
import React from 'react';
import ProfileHero from './ProfileHero';
import ProfileStats from './ProfileStats';
import ProfileTabs from './ProfileTabs';
import type { ReaderProfile, PrivacySettings } from '@/types/ReaderProfile';

interface PublicProfilePageProps {
  profile: ReaderProfile;
  privacySettings: PrivacySettings | null;
}

const PublicProfilePage = ({ profile, privacySettings }: PublicProfilePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Hero Section */}
          <ProfileHero profile={profile} />
          
          {/* Stats Section */}
          <ProfileStats profile={profile} privacySettings={privacySettings} />
          
          {/* Tabs Section */}
          <ProfileTabs profile={profile} privacySettings={privacySettings} />
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
