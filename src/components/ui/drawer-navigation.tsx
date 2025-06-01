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
        <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Account</div>
        <Separator className="mb-3" />
        <SheetClose asChild>
          <Link to="/reader-auth?tab=sign-in" className="block w-full mb-3">
            <Button variant="outline" className="w-full flex items-center">
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link to="/reader-auth?tab=sign-up" className="block w-full">
            <RainbowButton className="w-full flex items-center justify-center">
              <BookOpen className="mr-2 h-4 w-4" />
              Join Us
            </RainbowButton>
          </Link>
        </SheetClose>
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
