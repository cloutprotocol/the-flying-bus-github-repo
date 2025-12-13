import React, { createContext, useMemo } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ReaderProfile } from '@/types/ReaderProfile';
import { useToast } from '@/hooks/use-toast';
import { AuthContextType } from '@/types/AuthTypes';
import { inAppWallet } from 'thirdweb/wallets';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { toast } = useToast();

  // Fetch current user profile from Convex
  const userProfile = useQuery(api.profiles.getMyProfile);
  const ensureProfileMutation = useMutation(api.profiles.ensureProfile);
  const linkProfileMutation = useMutation(api.linkProfileToAuthUser.linkMyProfileToAuthUser);
  const currentUser: ReaderProfile | null = useMemo(() => {
    if (!userProfile) return null;
    return {
      id: userProfile._id,
      username: userProfile.username || '',
      display_name: userProfile.display_name || '',
      email: userProfile.email,
      role: userProfile.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: userProfile.bio || '',
      avatar_url: userProfile.avatar_url || '',
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
      public_bio: userProfile.public_bio,
      crypto_wallet_address: userProfile.crypto_wallet_address,
      badge_display_preferences: userProfile.badge_display_preferences,
      favorite_categories: userProfile.favorite_categories || undefined,
    };
  }, [userProfile]);

  // Ensure profile creation when authenticated but profile is missing.
  // Add a brief delay to allow the auth handshake to complete.
  const [ensureAttempted, setEnsureAttempted] = React.useState(false);

  // Reset attempt state when logged out
  React.useEffect(() => {
    if (!isAuthenticated) {
      setEnsureAttempted(false);
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const attemptEnsureProfile = async (retries = 5) => {
      if (!mounted) return;

      try {
        // First try to link to an existing profile by email (for migrated users)
        logger.debug(LogSource.AUTH, 'Attempting to link existing profile by email');
        const linkResult = await linkProfileMutation();

        if (linkResult.success) {
          logger.info(LogSource.AUTH, 'Successfully linked existing profile', linkResult);
          if (mounted) setEnsureAttempted(true);
          return;
        }

        // If no existing profile found, create a new one
        logger.debug(LogSource.AUTH, 'No existing profile found, creating new one');
        await ensureProfileMutation();
        if (mounted) setEnsureAttempted(true);
      } catch (e: any) {
        const isAuthError = e.message?.includes('Not authenticated');

        if (retries > 0) {
          // Exponential backoff: wait longer each time
          const delay = isAuthError ? 1000 * (6 - retries) : 500;
          logger.debug(LogSource.AUTH, `Auto-ensure profile retry (${retries} left) in ${delay}ms`, e.message);

          timeoutId = setTimeout(() => {
            if (mounted) attemptEnsureProfile(retries - 1);
          }, delay);
        } else {
          logger.warn(LogSource.AUTH, 'Auto-ensure profile failed after all retries', e);
          if (mounted) setEnsureAttempted(true); // Give up to stop loop
        }
      }
    };

    if (isAuthenticated && !authLoading && userProfile === null && !ensureAttempted) {
      logger.debug(LogSource.AUTH, 'Starting profile ensure/link process');
      // Longer initial delay to allow auth state to propagate
      timeoutId = setTimeout(() => {
        if (mounted) attemptEnsureProfile();
      }, 2000);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, authLoading, userProfile, ensureAttempted, ensureProfileMutation, linkProfileMutation]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      logger.info(LogSource.AUTH, 'Attempting login via Convex Auth', { email });

      await signIn("password", { email, password, flow: "signIn" });
      logger.info(LogSource.AUTH, 'SignIn succeeded, waiting for auth state to propagate');

      // Wait for auth state to propagate (Convex Auth stores token and updates state asynchronously)
      // This ensures isAuthenticated becomes true before we return
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });

      // await inAppWallet().disconnect(); // Disconnect WEB3 wallet on auth change - temporarily disabled for debugging
      return true;
    } catch (error: any) {
      logger.error(LogSource.AUTH, 'Login failed', error);

      let errorMessage = error.message;
      if (errorMessage?.includes('InvalidSecret') || errorMessage?.includes('Server Error') || errorMessage?.includes('Uncaught Error')) {
        errorMessage = "Invalid email or password.";
      }

      toast({
        title: "Login failed",
        description: errorMessage || "Invalid credentials",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (email: string, password: string, username: string, displayName: string): Promise<boolean> => {
    try {
      logger.info(LogSource.AUTH, 'Attempting registration via Convex Auth', { email, username, displayName });

      // Note: "flow: signUp" handles creation.
      await signIn("password", { email, password, flow: "signUp", name: displayName });
      logger.info(LogSource.AUTH, 'SignUp succeeded, waiting for auth state to propagate');

      // Wait for auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Welcome!",
        description: "Your account has been created",
      });

      await inAppWallet().disconnect();
      return true;
    } catch (error: any) {
      logger.error(LogSource.AUTH, 'Registration failed', error);
      toast({
        title: "Registration failed",
        description: error.message || "Could not register",
        variant: "destructive",
      });
      return false;
    }
  };

  // TODO: Migration of "Invitation" logic to Convex Auth
  const registerWithInvitation = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    invitationToken: string
  ): Promise<boolean> => {
    try {
      // This likely needs a custom Action in Convex that verifies token then calls auth.
      // For now, we reuse standard register but warn.
      logger.warn(LogSource.AUTH, 'Invitation logic needs migration to Convex Actions');
      return register(email, password, firstName + lastName, firstName + ' ' + lastName);
    } catch (e) {
      return false;
    }
  };

  const logout = async () => {
    try {
      logger.info(LogSource.AUTH, 'Logging out');
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out",
      });
      await inAppWallet().disconnect();
    } catch (error) {
      logger.error(LogSource.AUTH, 'Logout failed', error);
    }
  };

  const checkRoleAccess = (allowedRoles: string[]): boolean => {
    return currentUser ? allowedRoles.includes(currentUser.role) : false;
  };

  // Mock session object for compatibility
  const loggedIn = isAuthenticated;
  const session = loggedIn ? { user: { id: userProfile?._id || 'loading' } } : null;

  // Debug logging - log whenever auth state changes
  React.useEffect(() => {
    console.log('[AuthProvider] State UPDATE:', {
      isAuthenticated,
      authLoading,
      userProfile: userProfile ? 'exists' : userProfile === null ? 'null' : 'undefined',
      loggedIn,
      ensureAttempted,
      timestamp: new Date().toISOString(),
    });
  }, [isAuthenticated, authLoading, userProfile, loggedIn, ensureAttempted]);

  const value = useMemo(() => ({
    // User entities
    currentUser,
    user: currentUser,

    // Auth flags
    isLoggedIn: loggedIn,
    isAuthenticated: loggedIn,

    // Actions
    login,
    register,
    registerWithInvitation,
    logout,
    refreshUserProfile: async () => true, // Reactive updates handle this

    // Loading until Convex auth ready; when authed, also wait until profile query resolves (undefined -> loading)
    isLoading: authLoading || (loggedIn && userProfile === undefined),
    // Initialized when Convex auth loaded; if authed, profile query has resolved
    isInitialized: !authLoading && (!loggedIn || userProfile !== undefined),

    // Role checks
    checkRoleAccess,

    // Session shape kept for compatibility
    session: session as any,

    // No-ops for legacy API surface
    establishSession: async () => { },
    syncAuthState: async () => { },

    // Profile loading status
    profileLoadingStatus: userProfile ? 'loaded' : 'loading'
  }), [currentUser, isAuthenticated, authLoading, userProfile]);

  return (
    <AuthContext.Provider value={value as any}>
      {children}
    </AuthContext.Provider>
  );
};
