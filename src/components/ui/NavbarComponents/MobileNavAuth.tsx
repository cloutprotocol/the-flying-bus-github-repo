
import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, BookOpen, Loader2, Settings } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerAuth } from '@/components/ui/drawer-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MobileNavAuth: React.FC = () => {
  const { isLoggedIn, currentUser, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        <span className="ml-2 text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (isLoggedIn && currentUser) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-10 w-10 border-2 border-gray-100">
            <AvatarImage src={currentUser.avatar_url} alt={currentUser.display_name} />
            <AvatarFallback className="bg-gray-700 text-white">
              {currentUser.display_name.split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{currentUser.display_name}</span>
            <span className="text-xs text-gray-500">@{currentUser.username}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <SheetClose asChild>
            <Link 
              to={`/profile/${currentUser.username}`}
              className="flex items-center text-base py-2"
            >
              <User size={16} className="mr-2" />
              <span>My Profile</span>
            </Link>
          </SheetClose>
          
          <SheetClose asChild>
            <Link 
              to={`/profile/${currentUser.username}/edit`}
              className="flex items-center text-base py-2"
            >
              <Settings size={16} className="mr-2" />
              <span>Edit Profile</span>
            </Link>
          </SheetClose>
          
          <button 
            onClick={() => logout()}
            className="flex items-center text-base py-2 w-full text-left"
          >
            <LogOut size={16} className="mr-2" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
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
  );
};

export default MobileNavAuth;
