
import { ReaderProfile } from '@/types/ReaderProfile';
// Minimal session object retained for compatibility with existing usage
export type Session = { user: { id: string } } | null;

export interface AuthContextType {
  // Primary user entities
  currentUser: ReaderProfile | null;
  user: ReaderProfile | null; // Alias used across hooks like useRoleBasedAccess

  // Auth state flags
  isLoggedIn: boolean;        // Existing flag used by several components
  isAuthenticated: boolean;   // Back-compat alias expected by some hooks/pages
  isLoading: boolean;
  isInitialized: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string, displayName: string) => Promise<boolean>;
  registerWithInvitation: (email: string, password: string, firstName: string, lastName: string, invitationToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<boolean>;

  // Role checks
  checkRoleAccess: (allowedRoles: string[]) => boolean;

  // Legacy session shape used in a few places
  session: Session;

  // Loading helpers
  profileLoadingStatus: 'idle' | 'loading' | 'loaded' | 'error';

  // No-op session management placeholders
  establishSession: (session: Session) => Promise<void>;
  syncAuthState: () => Promise<void>;
}
