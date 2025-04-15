
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ReaderProfileEdit from '@/components/Readers/ReaderProfileEdit';
import { useAuth } from '@/contexts/AuthContext';

const ProfileEditPage = () => {
  const { username } = useParams();
  const { currentUser } = useAuth();
  
  // If no username is provided, redirect to home
  if (!username) {
    return <Navigate to="/" replace />;
  }
  
  // Only allow editing own profile
  if (!currentUser || currentUser.username !== username) {
    return <Navigate to={`/profile/${username}`} replace />;
  }
  
  return (
    <MainLayout>
      <ReaderProfileEdit profile={currentUser} />
    </MainLayout>
  );
};

export default ProfileEditPage;
