import React from 'react';
import { Link } from 'react-router-dom';
import { SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { NavItem } from '@/components/Layout/menuItems';
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogOut, Settings, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { DrawerAuth } from '@/components/ui/drawer-auth';

interface DrawerNavigationProps {
  items: NavItem[];
}

const DrawerNavigation: React.FC<DrawerNavigationProps> = ({ items }) => {
  const { currentUser, isLoggedIn, logout } = useAuth();
  
  const renderAuthSection = () => {
    if (isLoggedIn && currentUser) {
      return (
        <div className="mt-6 pt-6">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Account</div>
          <Separator className="mb-3" />
          <ul className="space-y-3">
            <li>
              <SheetClose asChild>
                <Link 
                  to={`/profile/${currentUser.username}`}
                  className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-900"
                >
                  <User size={16} className="mr-2" />
                  <span>My Profile</span>
                </Link>
              </SheetClose>
            </li>
            <li>
              <SheetClose asChild>
                <Link 
                  to="/wallet-test"
                  className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-900"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11m5 0-5 5m0 0V3m0 2h2a2 2 0 0 1 2 2v2" /></svg>
                  <span>Wallet</span>
                </Link>
              </SheetClose>
            </li>
            <li>
              <SheetClose asChild>
                <Link 
                  to="/settings"
                  className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-900"
                >
                  <Settings size={16} className="mr-2" />
                  <span>Settings</span>
                </Link>
              </SheetClose>
            </li>
            <li>
              <button 
                onClick={logout}
                className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-900 w-full text-left"
              >
                <LogOut size={16} className="mr-2" />
                <span>Log out</span>
              </button>
            </li>
          </ul>
        </div>
      );
    }
    
    return (
      <div className="mt-6 pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Get Started</div>
        <Separator className="mb-3" />
        <div className="space-y-3">
          <DrawerAuth 
            triggerComponent={
              <Button variant="outline" className="w-full flex items-center">
                <User className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            }
            defaultTab="sign-in"
          />
          
          <DrawerAuth 
            triggerComponent={
              <RainbowButton className="w-full flex items-center justify-center">
                <BookOpen className="mr-2 h-4 w-4" />
                Join Us
              </RainbowButton>
            }
            defaultTab="sign-up"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="font-semibold text-lg mb-6">Menu</div>
      <nav>
        <ul className="space-y-5">
          {items.map((item, index) => (
            <li key={index}>
              {item.to ? (
                <SheetClose asChild>
                  <Link 
                    to={item.to} 
                    className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-900"
                  >
                    {getCategoryIcon(item.text)}
                    <span className="ml-1">{item.text}</span>
                  </Link>
                </SheetClose>
              ) : (
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">{item.text}</div>
                  <Separator className="mb-3" />
                  {item.items && item.items.length > 0 && (
                    <ul className="space-y-3 pl-0">
                      {item.items.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <SheetClose asChild>
                            <Link 
                              to={subItem.to} 
                              className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-900"
                            >
                              {getCategoryIcon(subItem.text)}
                              <span className="ml-1">{subItem.text}</span>
                            </Link>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        {renderAuthSection()}
      </nav>
    </div>
  );
};

export default DrawerNavigation;
