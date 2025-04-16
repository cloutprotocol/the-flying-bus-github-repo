
import React, { createContext, useState, useEffect } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AuthContextType } from '@/types/AuthTypes';
import { fetchUserProfile, checkRoleAccess } from '@/utils/authUtils';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ReaderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();

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
          
          // Defer profile fetch to avoid potential Supabase auth deadlock
          setTimeout(async () => {
            const profile = await fetchUserProfile(currentSession.user.id);
            if (profile) {
              console.log('User profile loaded:', profile.displayName);
              setCurrentUser(profile);
            } else {
              console.error('Could not load user profile');
            }
            setIsLoading(false);
          }, 0);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth error during initial session check:', error);
        toast({
          title: "Authentication error",
          description: "An error occurred during authentication",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
    
    // Set up auth state listener FIRST, before checking the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event, newSession ? 'Session active' : 'No session');
      setSession(newSession);
      
      if (newSession) {
        // Defer profile fetch to avoid potential Supabase auth deadlock
        setTimeout(async () => {
          const profile = await fetchUserProfile(newSession.user.id);
          if (profile) {
            console.log('User profile updated after auth change:', profile.displayName);
            setCurrentUser(profile);
          } else {
            console.error('Could not update user profile after auth change');
          }
          setIsLoading(false);
        }, 0);
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });
    
    getInitialSession();
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
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
        setIsLoading(false);
        return false;
      }
      
      if (data.session) {
        console.log('Supabase login successful, session:', data.session.user.id);
        
        // We'll let the onAuthStateChange handle setting the user state
        // This ensures consistent state management
        
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in",
        });
        
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      console.log('Attempting to log out user');
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
        console.log('User successfully logged out');
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
