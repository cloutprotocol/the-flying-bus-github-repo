
import { useIsMobile } from '@/hooks/use-mobile';
import { useCallback } from 'react';

export interface MobileOptionProps {
  value: 'newest' | 'oldest' | 'a-z';
  label: string;
  icon: React.ReactNode;
}

export const useMobileFilter = () => {
  const isMobile = useIsMobile();
  
  // Use memoized values to prevent unnecessary re-renders
  return {
    isMobile
  };
};
