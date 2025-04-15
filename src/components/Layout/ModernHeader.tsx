
import React from 'react';
import { Menu } from 'lucide-react';
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

const HeaderLogo = () => (
  <Logo className="md:block hidden" size="xl" />
);

const MobileLogo = () => (
  <Logo className="md:hidden block" size="md" />
);

const ModernHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
      <div className="w-full px-0 md:px-0 lg:px-0 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
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
};

export default ModernHeader;
