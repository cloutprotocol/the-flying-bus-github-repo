
import { ReaderProfile } from '@/types/ReaderProfile';
import { Session } from '@supabase/supabase-js';

export interface AuthContextType {
  currentUser: ReaderProfile | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string, displayName: string) => Promise<boolean>;
  registerWithInvitation: (email: string, password: string, firstName: string, lastName: string, invitationToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<boolean>;
  isLoading: boolean;
  checkRoleAccess: (allowedRoles: string[]) => boolean;
  session: Session | null;
  user: { id: string } | null;
  // Session management methods
  establishSession: (session: Session) => Promise<void>;
  syncAuthState: () => Promise<void>;
}

export type AuthErrorType = {
  message: string;
  code?: string;
};

export type AuthResponse = {
  success: boolean;
  error?: AuthErrorType;
  user?: ReaderProfile;
  session?: Session;
};
