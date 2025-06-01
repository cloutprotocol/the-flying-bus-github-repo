
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

      setProfile(profileData);

      // Get privacy settings
      const { data: privacyData, error: privacyError } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (privacyError && privacyError.code !== 'PGRST116') {
        throw privacyError;
      }

      setPrivacySettings(privacyData);

      // Check if profile is private
      if (privacyData?.profile_visibility === 'private') {
        setNotFound(true);
        return;
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
