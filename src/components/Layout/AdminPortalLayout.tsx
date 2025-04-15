
import React from 'react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  PenLine, 
  LayoutDashboard, 
  FileText, 
  Users, 
  MessageSquare, 
  Settings, 
  BarChart3, 
  Newspaper,
  ClipboardCheck,
  Flag,
  AlertTriangle,
  Shield,
  BarChart,
  TrendingUp,
  Activity
} from 'lucide-react';
import Logo from '@/components/ui/logo';
import AdminHeader from './AdminHeader';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminPortalLayout = ({ children }: AdminPortalLayoutProps) => {
  const { currentUser, isLoggedIn } = useAuth();

  // This would eventually check for admin/author permissions
  // For now it always shows full admin navigation
  const isAdmin = true;
  const isAuthor = true;
  const isModerator = true;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-flyingbus-background">
        <Sidebar variant="inset" className="border-r border-gray-200">
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <Logo size="sm" />
              <div className="font-medium text-lg">Author Portal</div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Dashboard">
                      <Link to="/admin/dashboard">
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {isAuthor && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="My Articles">
                        <Link to="/admin/articles">
                          <PenLine className="w-5 h-5" />
                          <span>My Articles</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {/* Content Management */}
            {(isAdmin || isModerator) && (
              <SidebarGroup>
                <SidebarGroupLabel>Content Management</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="All Articles">
                        <Link to="/admin/all-articles">
                          <Newspaper className="w-5 h-5" />
                          <span>All Articles</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {isModerator && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Review Queue">
                          <Link to="/admin/approval-queue">
                            <ClipboardCheck className="w-5 h-5" />
                            <span>Review Queue</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Drafts">
                        <Link to="/admin/drafts">
                          <FileText className="w-5 h-5" />
                          <span>Drafts</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {isAdmin && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Users">
                          <Link to="/admin/users">
                            <Users className="w-5 h-5" />
                            <span>User Management</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            
            {/* Moderation */}
            {(isAdmin || isModerator) && (
              <SidebarGroup>
                <SidebarGroupLabel>Moderation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Comment Moderation">
                        <Link to="/admin/comment-moderation">
                          <MessageSquare className="w-5 h-5" />
                          <span>Comment Moderation</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Content Flagging">
                        <Link to="/admin/content-flagging">
                          <Flag className="w-5 h-5" />
                          <span>Content Flagging</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="User Reports">
                        <Link to="/admin/report-management">
                          <AlertTriangle className="w-5 h-5" />
                          <span>User Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            
            {/* Analytics */}
            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Analytics</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Dashboard">
                        <Link to="/admin/analytics">
                          <BarChart className="w-5 h-5" />
                          <span>Analytics Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Engagement">
                        <Link to="/admin/analytics?tab=engagement">
                          <Activity className="w-5 h-5" />
                          <span>User Engagement</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Performance">
                        <Link to="/admin/analytics?tab=content">
                          <TrendingUp className="w-5 h-5" />
                          <span>Content Performance</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
          
          <SidebarFooter className="border-t p-4">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link to="/admin/settings">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <AdminHeader />
            <div className="flex-1 p-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminPortalLayout;
