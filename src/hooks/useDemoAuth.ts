
import { ReaderProfile } from '@/types/ReaderProfile';
import { getReaderByUsername } from '@/data/readers';
import { useToast } from '@/components/ui/use-toast';

export const useDemoAuth = () => {
  const { toast } = useToast();

  const isDemoEmail = (email: string): boolean => {
    return email.includes('demo') || email === 'curious_reader';
  };

  const handleDemoLogin = (email: string): ReaderProfile | null => {
    console.log('Attempting demo login for:', email);
    const mockUsername = email.split('@')[0];
    const user = getReaderByUsername(mockUsername || email);
    
    if (user) {
      console.log('Demo login successful:', user.displayName);
      localStorage.setItem('flyingbus_username', user.username);
      
      toast({
        title: "Demo mode",
        description: `Signed in as ${user.displayName} (demo)`,
      });
      
      return user;
    }
    
    return null;
  };

  const handleDemoLogout = (): void => {
    localStorage.removeItem('flyingbus_username');
    
    toast({
      title: "Signed out",
      description: "You've been successfully signed out from demo mode",
    });
  };

  const checkDemoSession = (): ReaderProfile | null => {
    const mockUsername = localStorage.getItem('flyingbus_username');
    if (mockUsername) {
      console.log('Demo mode active for:', mockUsername);
      return getReaderByUsername(mockUsername);
    }
    return null;
  };

  return {
    isDemoEmail,
    handleDemoLogin,
    handleDemoLogout,
    checkDemoSession
  };
};
