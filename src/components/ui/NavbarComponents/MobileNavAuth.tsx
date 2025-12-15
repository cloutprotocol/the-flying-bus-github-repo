
import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, BookOpen, Loader2, Settings } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { useAuth } from '@/contexts/AuthContext';
import { DrawerAuth } from '@/components/ui/drawer-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useKanaCoinBalance } from '../../../../wallet/useWalletHook';
import { useConvexAuth } from 'convex/react';

const MobileNavAuth: React.FC = () => {
  const { isLoggedIn, currentUser, logout, isLoading } = useAuth();
  const { isAuthenticated: convexIsAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const authed = convexIsAuthenticated || isLoggedIn;

  if ((isLoading || convexLoading) && !authed) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        <span className="ml-2 text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (authed && currentUser) {
    // Kana Coin balance logic
    const walletAddress = currentUser.crypto_wallet_address;
    const { balance, isLoading, error } = useKanaCoinBalance(walletAddress);
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
              to="/wallet-dashboard"
              className="flex items-center text-base py-2"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11m5 0-5 5m0 0V3m0 2h2a2 2 0 0 1 2 2v2" /></svg>
              {(!walletAddress || error) ? (
                <span>Wallet</span>
              ) : isLoading ? (
                <span>Loading...</span>
              ) : (
                <span>{balance ? Number(balance).toFixed(2) : '0.00'} Kana Coins</span>
              )}
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
