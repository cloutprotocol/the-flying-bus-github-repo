
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import PublicProfilePage from '@/components/Profile/PublicProfilePage';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { ReaderProfile, PrivacySettings } from '@/types/ReaderProfile';

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Convex reactive queries
  const profileData = useQuery(api.profiles.getByUsername, username ? { username } : 'skip');
  const privacyData = useQuery(
    api.privacy.getByUser,
    profileData?._id ? { userId: profileData._id } : 'skip'
  );

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    if (profileData === undefined) return; // still loading
    if (!profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const transformedProfile: ReaderProfile = {
      id: profileData._id as any,
      email: profileData.email,
      display_name: profileData.display_name || '',
      username: profileData.username || '',
      role: profileData.role as any,
      avatar_url: profileData.avatar_url || '',
      bio: profileData.bio || '',
      public_bio: profileData.public_bio,
      crypto_wallet_address: profileData.crypto_wallet_address,
      badge_display_preferences: profileData.badge_display_preferences,
      favorite_categories: (profileData.favorite_categories as any) || undefined,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
    };
    setProfile(transformedProfile);

    if (privacyData === undefined) return; // still loading
    if (privacyData) {
      const transformedPrivacy: PrivacySettings = {
        user_id: privacyData.user_id as any,
        profile_visibility: privacyData.profile_visibility as any,
        show_reading_activity: (privacyData as any).show_reading_history ?? true,
        show_comment_history: true,
        show_badges: true,
        show_achievements: false,
        updated_at: privacyData.updated_at,
      };
      setPrivacySettings(transformedPrivacy);
      if (transformedPrivacy.profile_visibility === 'private') {
        setNotFound(true);
      }
    }
    setLoading(false);
  }, [username, profileData, privacyData]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading profile...</div>
        </div>
      </MainLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
            <p className="text-muted-foreground">This profile doesn't exist or is set to private.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PublicProfilePage profile={profile} privacySettings={privacySettings} />
    </MainLayout>
  );
};

export default PublicProfile;
