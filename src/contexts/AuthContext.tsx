
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { getReaderByUsername } from '@/data/readers';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  currentUser: ReaderProfile | null;
  isLoggedIn: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  checkRoleAccess: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ReaderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for saved login on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('flyingbus_username');
    if (savedUsername) {
      const user = getReaderByUsername(savedUsername);
      if (user) {
        setCurrentUser(user);
      } else {
        // Clear invalid saved data
        localStorage.removeItem('flyingbus_username');
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password?: string): Promise<boolean> => {
    // For demo purposes, we're using mock data instead of real auth
    // In a real app, this would call an API endpoint
    const user = getReaderByUsername(username);
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('flyingbus_username', username);
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${user.displayName}`,
      });
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('flyingbus_username');
    
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
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
    checkRoleAccess
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
