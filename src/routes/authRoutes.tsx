
import ProfilePage from '@/pages/ProfilePage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const authRoutes = [
  { path: "/profile/:userId", element: <ProfilePage /> },
  { 
    path: "/profile/edit", 
    element: <ProtectedRoute><ProfileEditPage /></ProtectedRoute>
  }
];
