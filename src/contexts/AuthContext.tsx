
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { getReaderByUsername } from '@/data/readers';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: ReaderProfile | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  checkRoleAccess: (allowedRoles: string[]) => boolean;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        setSession(currentSession);
        
        if (currentSession) {
          // Get user profile data
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching user profile:', error);
            toast({
              title: "Error loading profile",
              description: error.message,
              variant: "destructive",
            });
          } else if (profile) {
            const userProfile: ReaderProfile = {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name,
              email: profile.email,
              role: profile.role,
              bio: profile.bio || '',
              avatar: profile.avatar_url || '',
              joinedDate: new Date(profile.created_at),
            };
            setCurrentUser(userProfile);
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
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      
      if (!newSession) {
        setCurrentUser(null);
      }
    });
    
    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Update user profile when session changes
  useEffect(() => {
    async function getUserProfile() {
      if (session?.user.id && !currentUser) {
        setIsLoading(true);
        
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching user profile:', error);
          } else if (profile) {
            const userProfile: ReaderProfile = {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name,
              email: profile.email,
              role: profile.role,
              bio: profile.bio || '',
              avatar: profile.avatar_url || '',
              joinedDate: new Date(profile.created_at),
            };
            setCurrentUser(userProfile);
          }
        } catch (error) {
          console.error('Profile fetch error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    getUserProfile();
  }, [session]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // For demonstration, if email includes "demo", use mock data
      if (email.includes('demo')) {
        const mockUsername = email.split('@')[0];
        const user = getReaderByUsername(mockUsername);
        
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('flyingbus_username', mockUsername);
          
          toast({
            title: "Demo mode",
            description: `Signed in as ${user.displayName} (demo)`,
          });
          
          return true;
        }
        return false;
      }
      
      // Real Supabase authentication
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
        localStorage.removeItem('flyingbus_username');
        setCurrentUser(null);
        
        toast({
          title: "Signed out",
          description: "You've been successfully signed out from demo mode",
        });
        
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

  const checkRoleAccess = (allowedRoles: string[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    login,
    logout,
    isLoading,
    checkRoleAccess,
    session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
