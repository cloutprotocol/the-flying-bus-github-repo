import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AuthContextType } from '@/types/AuthTypes';
import { 
  fetchUserProfile, 
  checkRoleAccess as checkAccess,
  loginWithEmailPassword,
  logoutUser
} from '@/services/authService';
import { registerUser, registerUserWithInvitation } from '@/services/auth/authService';
import { inAppWallet } from 'thirdweb/wallets';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ReaderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [profileLoadingStatus, setProfileLoadingStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const { toast } = useToast();

  // Non-blocking background profile loading
  const loadProfileInBackground = useCallback(async (userId: string) => {
    setProfileLoadingStatus('loading');
    
    logger.info(LogSource.AUTH, 'Starting background profile loading', { userId });
    
    try {
      const profile = await fetchUserProfile(userId);
      
      if (profile) {
        logger.info(LogSource.AUTH, 'Background profile loading successful', { 
          userId,
          displayName: profile.display_name,
          role: profile.role
        });
        
        setCurrentUser(profile);
        setProfileLoadingStatus('loaded');
      } else {
        logger.warn(LogSource.AUTH, 'Background profile loading failed - no profile returned', { userId });
        setProfileLoadingStatus('error');
        
        // Don't show error toast for background loading failure
        // User can still use the app with session-only auth
      }
    } catch (error) {
      logger.error(LogSource.AUTH, 'Background profile loading error', {
        error: error?.message || 'Unknown error',
        userId
      });
      
      setProfileLoadingStatus('error');
      
      // Don't show error toast for background loading failure
      // User can still use the app with session-only auth
    }
  }, []); // Empty dependency array to prevent circular dependencies

  // Simplified session establishment - minimal setup for immediate data access
  const establishSession = useCallback(async (newSession: Session) => {
    logger.info(LogSource.AUTH, 'Starting minimal session establishment', { 
      userId: newSession.user.id,
      emailConfirmed: !!newSession.user.email_confirmed_at
    });
    
    // Set session immediately to establish authentication context
    // This allows data loading to proceed without waiting for profile
    setSession(newSession);
    setIsLoading(false);
    setIsInitialized(true);
    
    logger.info(LogSource.AUTH, 'Session context established immediately', { 
      userId: newSession.user.id
    });
    
    // Load profile in background without blocking
    loadProfileInBackground(newSession.user.id);
  }, []); // CRITICAL FIX: Empty dependency array to prevent circular dependencies

  // Simplified authentication state synchronization
  const syncAuthState = useCallback(async () => {
    logger.info(LogSource.AUTH, 'Starting simplified auth state sync');
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      logger.info(LogSource.AUTH, 'Retrieved current session for sync', {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id
      });
      
      if (currentSession) {
        await establishSession(currentSession);
      } else {
        logger.info(LogSource.AUTH, 'No session found, clearing auth state');
        setSession(null);
        setCurrentUser(null);
        setProfileLoadingStatus('idle');
        setIsLoading(false);
        setIsInitialized(true);
      }
      
      logger.info(LogSource.AUTH, 'Auth state sync completed');
    } catch (error) {
      logger.error(LogSource.AUTH, 'Error during auth state sync', {
        error: error?.message || 'Unknown error'
      });
      
      // Always complete initialization to prevent blocking
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [establishSession]);

  useEffect(() => {
    let isMounted = true;
    
    async function getInitialSession() {
      if (!isMounted) return;
      
      setIsLoading(true);
      
      logger.info(LogSource.AUTH, 'Starting initial session check');
      
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!isMounted) {
          logger.warn(LogSource.AUTH, 'Component unmounted during initial session check');
          return;
        }
        
        logger.info(LogSource.AUTH, 'Initial session retrieved', { 
          hasSession: !!currentSession,
          userId: currentSession?.user?.id
        });
        
        if (currentSession) {
          await establishSession(currentSession);
        } else {
          logger.info(LogSource.AUTH, 'No initial session found, completing initialization');
          setIsLoading(false);
          setIsInitialized(true);
        }
        
        logger.info(LogSource.AUTH, 'Initial session check completed');
      } catch (error) {
        if (!isMounted) {
          logger.warn(LogSource.AUTH, 'Component unmounted during error handling');
          return;
        }
        
        logger.error(LogSource.AUTH, 'Error during initial session check', {
          error: error?.message || 'Unknown error'
        });
        
        // Always complete initialization to prevent blocking data loading
        setIsLoading(false);
        setIsInitialized(true);
      }
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      
      logger.info(LogSource.AUTH, 'Auth state change detected', { 
        event, 
        hasSession: !!newSession,
        userId: newSession?.user?.id
      });
      
      // Simplified auth state change handling to prevent data loading interference
      try {
        if (event === 'SIGNED_OUT') {
          logger.info(LogSource.AUTH, 'Processing sign out event');
          setCurrentUser(null);
          setSession(null);
          setProfileLoadingStatus('idle');
          setIsLoading(false);
          setIsInitialized(true);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          logger.info(LogSource.AUTH, 'Processing token refresh event');
          // For token refresh, just update session - don't interfere with data loading
          setSession(newSession);
          // Only load profile in background if we don't have user data
          if (!currentUser && profileLoadingStatus === 'idle') {
            loadProfileInBackground(newSession.user.id);
          }
        } else if (event === 'SIGNED_IN' && newSession) {
          logger.info(LogSource.AUTH, 'Processing sign in event');
          await establishSession(newSession);
        }
        
        logger.info(LogSource.AUTH, 'Auth state change processed successfully', { event });
      } catch (error) {
        logger.error(LogSource.AUTH, 'Error processing auth state change', {
          event,
          error: error?.message || 'Unknown error'
        });
        
        // Always ensure initialization is complete to prevent blocking
        setIsLoading(false);
        setIsInitialized(true);
      }
    });
    
    getInitialSession();
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // CRITICAL FIX: Empty dependency array to prevent infinite loops

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      logger.info(LogSource.AUTH, 'Attempting login', { email });
      const { session: authSession, error } = await loginWithEmailPassword(email, password);
      
      if (error) {
        logger.error(LogSource.AUTH, 'Login failed', error);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
      
      if (authSession) {
        logger.info(LogSource.AUTH, 'Login successful', { userId: authSession.user.id });
        
        // Use simplified session establishment for immediate data access
        await establishSession(authSession);
        
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in",
        });
        
        await inAppWallet().disconnect();
        
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      logger.error(LogSource.AUTH, 'Login exception', error);
      toast({
        title: "Login error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const register = async (email: string, password: string, username: string, displayName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      logger.info(LogSource.AUTH, 'Attempting standard registration with auto-login', { email, username });
      const result = await registerUser(email, password, username, displayName);
      
      if (!result.success) {
        logger.error(LogSource.AUTH, 'Registration failed', result.error);
        toast({
          title: "Registration failed",
          description: result.error?.message || "An error occurred during registration",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
      
      logger.info(LogSource.AUTH, 'Registration successful with auto-login');
      
      // Use simplified session establishment for immediate access
      if (result.session) {
        await establishSession(result.session);
      } else if (result.user) {
        // Fallback: set user directly if no session but user exists
        setCurrentUser(result.user);
        setProfileLoadingStatus('loaded');
        setIsLoading(false);
        setIsInitialized(true);
      }
      
      toast({
        title: "Welcome!",
        description: "Your account has been created and you're now signed in",
      });
      
      await inAppWallet().disconnect();
      
      return true;
    } catch (error) {
      logger.error(LogSource.AUTH, 'Registration exception', error);
      toast({
        title: "Registration error",
        description: "An unexpected error occurred during registration",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const registerWithInvitation = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    invitationToken: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      logger.info(LogSource.AUTH, 'Attempting invitation registration with auto-login', { 
        email, 
        invitationToken 
      });
      
      const result = await registerUserWithInvitation(email, password, firstName, lastName, invitationToken);
      
      if (!result.success) {
        logger.error(LogSource.AUTH, 'Invitation registration failed', result.error);
        toast({
          title: "Registration failed",
          description: result.error?.message || "An error occurred during invitation registration",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
      
      logger.info(LogSource.AUTH, 'Invitation registration successful with auto-login');
      
      // Use simplified session establishment for immediate access
      if (result.session) {
        await establishSession(result.session);
      } else if (result.user) {
        // Fallback: set user directly if no session but user exists
        setCurrentUser(result.user);
        setProfileLoadingStatus('loaded');
        setIsLoading(false);
        setIsInitialized(true);
      }
      
      toast({
        title: "Welcome to the team!",
        description: "Your author account has been created and you're now signed in",
      });
      
      await inAppWallet().disconnect();
      
      return true;
    } catch (error) {
      logger.error(LogSource.AUTH, 'Invitation registration exception', error);
      toast({
        title: "Registration error",
        description: "An unexpected error occurred during invitation registration",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      logger.info(LogSource.AUTH, 'Attempting to log out user');
      const { error } = await logoutUser();
      
      if (error) {
        logger.error(LogSource.AUTH, 'Logout failed', error);
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setCurrentUser(null);
        setSession(null);
        setProfileLoadingStatus('idle');
        logger.info(LogSource.AUTH, 'User successfully logged out');
        toast({
          title: "Signed out",
          description: "You've been successfully signed out",
        });
        await inAppWallet().disconnect();
      }
    } catch (error) {
      logger.error(LogSource.AUTH, 'Logout exception', error);
      toast({
        title: "Logout error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserProfile = async (): Promise<boolean> => {
    if (!session?.user?.id) {
      logger.warn(LogSource.AUTH, 'Cannot refresh profile: no active session');
      return false;
    }

    try {
      logger.info(LogSource.AUTH, 'Refreshing user profile', { userId: session.user.id });
      
      // Use background loading approach for consistency
      loadProfileInBackground(session.user.id);
      
      // Return true immediately since we're loading in background
      return true;
    } catch (error) {
      logger.error(LogSource.AUTH, 'Error refreshing user profile', error);
      return false;
    }
  };

  const checkRoleAccess = (allowedRoles: string[]): boolean => {
    return currentUser ? allowedRoles.includes(currentUser.role) : false;
  };

  // Memoize the context value to prevent unnecessary re-renders
  // Only re-create context when essential state changes
  const value = useMemo(() => {
    logger.debug(LogSource.AUTH, 'AuthContext value being memoized', {
      hasCurrentUser: !!currentUser,
      isLoading,
      isInitialized,
      hasSession: !!session,
      profileLoadingStatus
    });
    
    return {
      currentUser,
      isLoggedIn: !!currentUser,
      login,
      register,
      registerWithInvitation,
      logout,
      refreshUserProfile,
      isLoading,
      isInitialized,
      checkRoleAccess,
      session,
      user: currentUser ? { id: currentUser.id } : null,
      establishSession,
      syncAuthState,
      profileLoadingStatus
    };
  }, [
    currentUser,
    isLoading,
    isInitialized,
    session,
    profileLoadingStatus
    // CRITICAL FIX: Removed function dependencies to prevent circular re-renders
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
