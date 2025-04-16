
import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';

export interface AuthContextType {
  currentUser: {
    id: string;
    displayName: string;
    avatar?: string;
    username: string;
    role: string;
  } | null;
  user: {
    id: string;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
