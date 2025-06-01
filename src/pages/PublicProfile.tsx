
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import PublicProfilePage from '@/components/Profile/PublicProfilePage';
import { supabase } from '@/integrations/supabase/client';
import type { ReaderProfile, PrivacySettings } from '@/types/ReaderProfile';

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    if (!username) return;

    try {
      setLoading(true);

      // Get profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        setNotFound(true);
        return;
      }

      // Transform the data to match ReaderProfile interface
      const transformedProfile: ReaderProfile = {
        id: profileData.id,
        email: profileData.email,
        display_name: profileData.display_name,
        username: profileData.username,
        role: profileData.role,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        public_bio: profileData.public_bio,
        crypto_wallet_address: profileData.crypto_wallet_address,
        badge_display_preferences: profileData.badge_display_preferences,
        favorite_categories: profileData.favorite_categories,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      setProfile(transformedProfile);

      // Get privacy settings
      const { data: privacyData, error: privacyError } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (privacyError && privacyError.code !== 'PGRST116') {
        throw privacyError;
      }

      if (privacyData) {
        // Transform privacy data to ensure proper typing
        const transformedPrivacy: PrivacySettings = {
          user_id: privacyData.user_id,
          profile_visibility: privacyData.profile_visibility as 'public' | 'private',
          show_reading_activity: privacyData.show_reading_activity,
          show_comment_history: privacyData.show_comment_history,
          show_badges: privacyData.show_badges,
          show_achievements: privacyData.show_achievements,
          updated_at: privacyData.updated_at,
        };
        setPrivacySettings(transformedPrivacy);

        // Check if profile is private
        if (transformedPrivacy.profile_visibility === 'private') {
          setNotFound(true);
          return;
        }
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

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
