
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
  isInitialized: boolean;
  checkRoleAccess: (allowedRoles: string[]) => boolean;
  session: Session | null;
  user: { id: string } | null;
  profileLoadingStatus: 'idle' | 'loading' | 'loaded' | 'error';
  // Session management methods
  establishSession: (session: Session) => Promise<void>;
  syncAuthState: () => Promise<void>;
}
