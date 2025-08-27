
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  FileText, 
  Home, 
  Settings, 
  Users, 
  FolderOpen, 
  Image,
  MessageSquare,
  ListCheck,
  Plus,
  Mail
} from 'lucide-react';
import { useArticleTypeSelection } from '@/contexts/ArticleTypeSelectionContext';
import { useAuth } from '@/hooks/useAuth';

// Define navigation items with role requirements
const allNavItems = [
  { 
    icon: <Home className="h-5 w-5" />, 
    label: 'Dashboard', 
    path: '/admin/dashboard',
    requiredRole: 'author' // All admin users can access dashboard
  },
  { 
    icon: <FileText className="h-5 w-5" />, 
    label: 'Articles', 
    path: '/admin/articles',
    requiredRole: 'author' // Authors can manage their articles
  },
  { 
    icon: <ListCheck className="h-5 w-5" />, 
    label: 'Content Review', 
    path: '/admin/approval-queue',
    requiredRole: 'moderator' // Only moderators+ can review content
  },
  { 
    icon: <Image className="h-5 w-5" />, 
    label: 'Media', 
    path: '/admin/media',
    requiredRole: 'author' // Authors can manage media
  },
  { 
    icon: <MessageSquare className="h-5 w-5" />, 
    label: 'Comments', 
    path: '/admin/comment-moderation',
    requiredRole: 'author' // Authors can moderate their own comments
  },
  { 
    icon: <Mail className="h-5 w-5" />, 
    label: 'Invitations', 
    path: '/admin/invitations',
    requiredRole: 'admin' // Only admins can manage invitations
  },
  { 
    icon: <Users className="h-5 w-5" />, 
    label: 'Users', 
    path: '/admin/users',
    requiredRole: 'admin' // Only admins can manage users
  },
  { 
    icon: <Settings className="h-5 w-5" />, 
    label: 'Settings', 
    path: '/admin/settings',
    requiredRole: 'admin' // Only admins can access settings
  },
];

const AdminHeader = () => {
  const location = useLocation();
  const { openModal } = useArticleTypeSelection();
  const { currentUser } = useAuth();
  
  // Helper function to determine user role
  const getUserRole = (user: any): 'admin' | 'moderator' | 'author' | 'reader' => {
    if (!user || !user.role) return 'reader';
    const role = user.role.toLowerCase();
    if (['admin', 'moderator', 'author'].includes(role)) {
      return role as 'admin' | 'moderator' | 'author';
    }
    return 'reader';
  };

  // Helper function to check minimum role
  const hasMinRole = (requiredRole: string): boolean => {
    const userRole = getUserRole(currentUser);
    const roleHierarchy = { reader: 0, author: 1, moderator: 2, admin: 3 };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy];
  };

  const userRole = getUserRole(currentUser);
  
  // Filter navigation items based on user role
  const navItems = allNavItems.filter(item => {
    return hasMinRole(item.requiredRole);
  });
  
  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/admin" className="flex items-center mr-10">
            <FolderOpen className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg">Admin Portal</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path));
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="flex items-center gap-2 h-10"
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Only show New Article button for authors and above */}
          {hasMinRole('author') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={openModal}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Article
            </Button>
          )}
          
          <Link to="/" className="mr-2">
            <Button variant="outline" size="sm">
              View Site
            </Button>
          </Link>
          
          <Avatar>
            <AvatarImage src={currentUser?.avatar_url} />
            <AvatarFallback>
              {currentUser?.display_name 
                ? currentUser.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : 'U'
              }
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
