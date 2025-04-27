
import React, { useEffect, memo } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Logo from '@/components/ui/logo';
import { HeaderButtons } from '@/components/ui/header-buttons';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import menuItems from './menuItems';
import DrawerNavigation from '@/components/ui/drawer-navigation';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const HeaderLogo = memo(() => (
  <Logo className="md:block hidden" size="xl" />
));

const MobileLogo = memo(() => (
  <Logo className="md:hidden block" size="md" />
));

const ModernHeader = memo(() => {
  const location = useLocation();
  
  useEffect(() => {
    logger.info(LogSource.APP, 'Header mounted', {
      pathname: location.pathname,
      key: location.key
    });
    
    return () => {
      logger.info(LogSource.APP, 'Header unmounted', {
        pathname: location.pathname,
        key: location.key
      });
    };
  }, []); // Only run on mount and unmount, not on location changes

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200" id="main-header">
      <div className="w-full px-4 md:px-6 lg:px-10 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HeaderLogo />
            <MobileLogo />
          </div>
          <div className="flex items-center gap-x-4">
            <HeaderButtons />
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 hover:bg-transparent hover:scale-105 active:scale-95 transition-transform"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-80 overflow-y-auto">
                <DrawerNavigation items={menuItems} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
});

ModernHeader.displayName = 'ModernHeader';
HeaderLogo.displayName = 'HeaderLogo';
MobileLogo.displayName = 'MobileLogo';

export default ModernHeader;
