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
  // Only query when authenticated to avoid caching a pre-login null result
  const userProfile = useQuery(
    api.profiles.getMyProfile,
    isAuthenticated ? {} : undefined
  );
  const ensureProfileMutation = useMutation(api.profiles.ensureProfile);
  const linkProfileMutation = useMutation(api.linkProfileToAuthUser.linkMyProfileToAuthUser);
  const currentUser: ReaderProfile | null = useMemo(() => {
    // If userProfile is undefined (loading) or null (not found), return null
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

  // Helper to wait for auth state to propagate
  const waitForAuth = async (expectAuthenticated: boolean, timeoutMs = 5000): Promise<boolean> => {
    const startTime = Date.now();

    // We can't use the hook value directly in a loop because it won't update within this closure
    // So we just rely on a small delay loop and trust the reactivity system will update the component
    // BUT checking the ref/value in a loop here is tricky in React. 
    // The `signIn` action sets the token in the Convey client.
    // The client then notifies listeners. 
    // The best we can do in a function is wait a bit or use a flag.

    return new Promise((resolve) => {
      const check = () => {
        // We can check local storage as a proxy for "token received"
        // STRICT CHECK: Must look for the actual JWT key, not just any convex key (which includes wake/refresh)
        // The key format is usually `__convexAuthJWT_${host}`
        const hasToken = typeof window !== 'undefined' &&
          Object.keys(localStorage).some(k => k.startsWith('__convexAuthJWT_'));

        if (expectAuthenticated === !!hasToken) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(check, 50);
      };
      check();
    });
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      logger.info(LogSource.AUTH, 'Attempting login via Convex Auth', { email });

      await signIn("password", { email, password, flow: "signIn" });
      logger.info(LogSource.AUTH, 'SignIn succeeded, waiting for token storage');

      // Wait for token to appear in storage (robust proxy for auth success)
      const tokenReceived = await waitForAuth(true);

      if (!tokenReceived) {
        throw new Error("Login succeeded on server but client received no session token. Please try again.");
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });

      // await inAppWallet().disconnect(); // Disconnect WEB3 wallet on auth change - temporarily disabled for debugging
      return true;
    } catch (error: any) {
      logger.error(LogSource.AUTH, 'Login failed', error);

      let errorMessage = error.message;
      if (errorMessage?.includes('InvalidSecret')) {
        errorMessage = "Incorrect password. Please try again or reset your password.";
      } else if (errorMessage?.includes('Server Error') || errorMessage?.includes('Uncaught Error')) {
        console.error("Login Error Detail:", errorMessage);
        errorMessage = "An unexpected error occurred. Please try again.";
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
      const tokenReceived = await waitForAuth(true);

      if (!tokenReceived) {
        throw new Error("Registration succeeded but client received no session token.");
      }

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

    // Loading: Convex auth is loading OR we are authenticated but profile query hasn't returned yet
    isLoading: authLoading || (isAuthenticated && userProfile === undefined),

    // Initialized: Auth is done loading AND if we are logged in, we have a profile result (null or object)
    isInitialized: !authLoading && (!isAuthenticated || userProfile !== undefined),

    // Role checks
    checkRoleAccess,

    // Session shape kept for compatibility
    session: session as any,

    // No-ops for legacy API surface
    establishSession: async () => { },
    syncAuthState: async () => { },

    // Profile loading status
    profileLoadingStatus: userProfile === undefined ? 'loading' : 'loaded'
  }), [currentUser, isAuthenticated, authLoading, userProfile]);

  return (
    <AuthContext.Provider value={value as any}>
      {children}
    </AuthContext.Provider>
  );
};
