
import React, { createContext, useState, useEffect } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AuthContextType } from '@/types/AuthTypes';
import { fetchUserProfile, checkRoleAccess } from '@/utils/authUtils';
import { useDemoAuth } from '@/hooks/useDemoAuth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ReaderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const { isDemoEmail, handleDemoLogin, handleDemoLogout, checkDemoSession } = useDemoAuth();

  // Check for existing session on mount
  useEffect(() => {
    async function getInitialSession() {
      setIsLoading(true);
      
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        console.log('Initial auth check:', currentSession ? 'Session found' : 'No session');
        
        if (currentSession) {
          setSession(currentSession);
          
          // First check if we're in demo mode
          const demoUser = checkDemoSession();
          if (demoUser) {
            setCurrentUser(demoUser);
            setIsLoading(false);
            return;
          }
          
          // Get user profile data
          const profile = await fetchUserProfile(currentSession.user.id);
          if (profile) {
            setCurrentUser(profile);
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast({
          title: "Authentication error",
          description: "An error occurred during authentication",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    getInitialSession();
    
    // Set up auth state listener FIRST, before checking the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event, newSession ? 'Session active' : 'No session');
      setSession(newSession);
      
      // For demo mode, no need to fetch profile
      const demoUser = checkDemoSession();
      if (demoUser) {
        if (!newSession) {
          console.log('Demo user logged out');
          setCurrentUser(null);
        } else {
          setCurrentUser(demoUser);
        }
        return;
      }
      
      // For real auth, handle session changes
      if (newSession) {
        // Defer profile fetch to avoid potential Supabase auth deadlock
        setTimeout(() => {
          fetchUserProfile(newSession.user.id).then(profile => {
            if (profile) setCurrentUser(profile);
          });
        }, 0);
      } else {
        setCurrentUser(null);
      }
    });
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // For demonstration, if email includes "demo", use mock data
      if (isDemoEmail(email)) {
        const user = handleDemoLogin(email);
        if (user) {
          setCurrentUser(user);
          return true;
        }
        return false;
      }
      
      // Real Supabase authentication
      console.log('Attempting Supabase login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      if (data.session) {
        console.log('Supabase login successful');
        // Session will be set by the onAuthStateChange listener
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in",
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      // Mock data logout
      if (localStorage.getItem('flyingbus_username')) {
        handleDemoLogout();
        setCurrentUser(null);
        setSession(null);
        return;
      }
      
      // Real Supabase logout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setCurrentUser(null);
        setSession(null);
        toast({
          title: "Signed out",
          description: "You've been successfully signed out",
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    login,
    logout,
    isLoading,
    checkRoleAccess: (allowedRoles: string[]) => checkRoleAccess(currentUser, allowedRoles),
    session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
