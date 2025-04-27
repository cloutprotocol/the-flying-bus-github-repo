
import { useIsMobile } from '@/hooks/use-mobile';

export interface MobileOptionProps {
  value: 'newest' | 'oldest' | 'a-z';
  label: string;
  icon: React.ReactNode;
}

export const useMobileFilter = () => {
  const isMobile = useIsMobile();
  return { isMobile };
};
