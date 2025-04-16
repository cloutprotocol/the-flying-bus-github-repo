
import React from 'react';
import { Navigate } from 'react-router-dom';
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

  // Show loading state while auth state is being determined
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/reader-auth?tab=sign-in&redirect=/admin" replace />;
  }

  // Redirect to homepage if not authorized (wrong role)
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    console.log('User role not authorized:', currentUser?.role);
    return <Navigate to="/" replace />;
  }

  // User is authenticated and authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
