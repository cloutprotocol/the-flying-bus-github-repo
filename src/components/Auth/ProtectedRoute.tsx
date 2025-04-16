
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['admin', 'moderator', 'author'] 
}) => {
  const { currentUser, isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while auth state is being determined
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // If not logged in, redirect to login with the current path as the redirect destination
  if (!isLoggedIn) {
    console.log('User not logged in, redirecting to auth');
    return <Navigate to={`/reader-auth?tab=sign-in&redirect=${location.pathname}`} replace />;
  }

  // If logged in but not authorized (wrong role), redirect to homepage
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    console.log('User role not authorized:', currentUser?.role, 'Allowed roles:', allowedRoles);
    return <Navigate to="/" replace />;
  }

  // User is authenticated and authorized, render children
  console.log('User authorized, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
