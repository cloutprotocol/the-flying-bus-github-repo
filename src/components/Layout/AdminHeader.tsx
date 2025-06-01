
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

const navItems = [
  { icon: <Home className="h-5 w-5" />, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: <FileText className="h-5 w-5" />, label: 'Articles', path: '/admin/articles' },
  { icon: <ListCheck className="h-5 w-5" />, label: 'Content Review', path: '/admin/approval-queue' },
  { icon: <Image className="h-5 w-5" />, label: 'Media', path: '/admin/media' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Comments', path: '/admin/comment-moderation' },
  { icon: <Mail className="h-5 w-5" />, label: 'Invitations', path: '/admin/invitations' },
  { icon: <Users className="h-5 w-5" />, label: 'Users', path: '/admin/users' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/admin/settings' },
];

const AdminHeader = () => {
  const location = useLocation();
  const { openModal } = useArticleTypeSelection();
  
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={openModal}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Article
          </Button>
          
          <Link to="/" className="mr-2">
            <Button variant="outline" size="sm">
              View Site
            </Button>
          </Link>
          
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
