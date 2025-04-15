
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ReaderProfilePage from '@/components/Readers/ReaderProfilePage';
import { useAuth } from '@/contexts/AuthContext';
import { getReaderByUsername } from '@/data/readers';

const ProfilePage = () => {
  const { username } = useParams();
  const { currentUser } = useAuth();
  
  // If no username is provided, redirect to home
  if (!username) {
    return <Navigate to="/" replace />;
  }
  
  // Get the reader profile based on the username
  const readerProfile = getReaderByUsername(username);
  
  // If profile doesn't exist, redirect to 404
  if (!readerProfile) {
    return <Navigate to="/not-found" replace />;
  }
  
  // Check if this is the current user viewing their own profile
  const isOwnProfile = currentUser?.username === username;
  
  return (
    <MainLayout>
      <ReaderProfilePage profile={readerProfile} isOwnProfile={isOwnProfile} />
    </MainLayout>
  );
};

export default ProfilePage;
