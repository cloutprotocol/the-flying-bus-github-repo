
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

const AdminHeader = () => {
  const { currentUser, logout } = useAuth();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  const userInitials = currentUser?.displayName 
    ? getInitials(currentUser.displayName) 
    : 'U';
    
  const roleLabel = () => {
    if (!currentUser) return '';
    switch (currentUser.role) {
      case 'admin': return 'Administrator';
      case 'moderator': return 'Content Moderator';
      case 'author': return 'Young Journalist';
      default: return '';
    }
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 py-3 px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <SidebarTrigger className="mr-4" />
          <h1 className="text-xl font-medium hidden md:block">
            {roleLabel()} Portal
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" className="text-gray-600">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="outline" size="icon" className="text-gray-600 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={currentUser?.avatar} alt={currentUser?.displayName || 'User'} />
                  <AvatarFallback className="bg-neutral-700 text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-50">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser?.displayName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    @{currentUser?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {roleLabel()}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/profile/${currentUser?.username}`} className="flex items-center cursor-pointer">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/profile/${currentUser?.username}/edit`} className="flex items-center cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
