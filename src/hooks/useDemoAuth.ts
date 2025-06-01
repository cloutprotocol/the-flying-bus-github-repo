
import { useState } from 'react';
import { getReaderByUsername } from '@/data/readers';
import { ReaderProfile } from '@/types/ReaderProfile';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useDemoAuth = () => {
  const [currentUser, setCurrentUser] = useState<ReaderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const demoLogin = async (username: string) => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = getReaderByUsername(username);
    if (user) {
      logger.info(LogSource.AUTH, 'Demo login successful', { username, displayName: user.display_name });
      setCurrentUser(user);
    } else {
      logger.error(LogSource.AUTH, 'Demo user not found', { username });
      throw new Error(`Demo user '${username}' not found`);
    }
    
    setIsLoading(false);
  };

  const demoLogout = async () => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentUser(null);
    setIsLoading(false);
  };

  return {
    currentUser,
    isLoggedIn: !!currentUser,
    isLoading,
    demoLogin,
    demoLogout,
  };
};
