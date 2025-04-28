
import { RouteObject } from 'react-router-dom';
import Index from '@/pages/Index';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import StoryboardPage from '@/pages/StoryboardPage';
import StoryboardCategoryPage from '@/pages/StoryboardCategoryPage';
import StoryboardEpisodePage from '@/pages/StoryboardEpisodePage';
import NotFound from '@/pages/NotFound';
import About from '@/pages/About';
import ReaderAuth from '@/pages/ReaderAuth';
import ProfilePage from '@/pages/ProfilePage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import AdminPortalIndex from '@/pages/Admin/AdminPortalIndex';
import Dashboard from '@/pages/Admin/Dashboard';
import MyArticles from '@/pages/Admin/MyArticles';
import ArticleEditor from '@/pages/Admin/ArticleEditor';
import MediaManager from '@/pages/Admin/MediaManager';
import UserManagement from '@/pages/Admin/UserManagement';
import ApprovalQueue from '@/pages/Admin/ApprovalQueue';
import ArticleReview from '@/pages/Admin/ArticleReview';
import CommentModeration from '@/pages/Admin/CommentModeration';
import ContentFlagging from '@/pages/Admin/ContentFlagging';
import ReportManagement from '@/pages/Admin/ReportManagement';
import AnalyticsDashboard from '@/pages/Admin/AnalyticsDashboard';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

// Public routes
export const publicRoutes: RouteObject[] = [
  { path: '/', element: <Index /> },
  { path: '/articles/:articleId', element: <ArticlePage /> },
  { path: '/category/:categoryId', element: <CategoryPage /> },
  { path: '/headliners', element: <CategoryPage /> },
  { path: '/debates', element: <CategoryPage /> },
  { path: '/spice-it-up', element: <CategoryPage /> },
  { path: '/in-the-neighborhood', element: <CategoryPage /> },
  { path: '/learning', element: <CategoryPage /> },
  { path: '/school-news', element: <CategoryPage /> },
  { path: '/storyboard/:seriesId', element: <StoryboardPage /> },
  { path: '/storyboard', element: <StoryboardCategoryPage /> },
  { path: '/storyboard/:seriesId/episode/:episodeId', element: <StoryboardEpisodePage /> },
  { path: '/about', element: <About /> },
  { path: '/reader-auth', element: <ReaderAuth /> },
  { path: '/profile/:userId', element: <ProfilePage /> }
];

// Protected routes that require authentication
export const protectedRoutes: RouteObject[] = [
  { 
    path: '/profile/edit', 
    element: <ProtectedRoute><ProfileEditPage /></ProtectedRoute> 
  },
  { 
    path: '/admin', 
    element: <ProtectedRoute><AdminPortalIndex /></ProtectedRoute> 
  },
  { 
    path: '/admin/dashboard', 
    element: <ProtectedRoute><Dashboard /></ProtectedRoute> 
  },
  { 
    path: '/admin/articles', 
    element: <ProtectedRoute><MyArticles /></ProtectedRoute> 
  },
  { 
    path: '/admin/articles/new', 
    element: <ProtectedRoute><ArticleEditor /></ProtectedRoute> 
  },
  { 
    path: '/admin/articles/:articleId', 
    element: <ProtectedRoute><ArticleEditor /></ProtectedRoute> 
  },
  { 
    path: '/admin/media', 
    element: <ProtectedRoute><MediaManager /></ProtectedRoute> 
  },
  { 
    path: '/admin/users', 
    element: <ProtectedRoute><UserManagement /></ProtectedRoute> 
  },
  { 
    path: '/admin/approval-queue', 
    element: <ProtectedRoute><ApprovalQueue /></ProtectedRoute> 
  },
  { 
    path: '/admin/reviews/:articleId', 
    element: <ProtectedRoute><ArticleReview /></ProtectedRoute> 
  },
  { 
    path: '/admin/comment-moderation', 
    element: <ProtectedRoute><CommentModeration /></ProtectedRoute> 
  },
  { 
    path: '/admin/content-flagging', 
    element: <ProtectedRoute><ContentFlagging /></ProtectedRoute> 
  },
  { 
    path: '/admin/report-management', 
    element: <ProtectedRoute><ReportManagement /></ProtectedRoute> 
  },
  { 
    path: '/admin/analytics', 
    element: <ProtectedRoute><AnalyticsDashboard /></ProtectedRoute> 
  },
  { path: '/admin/*', element: <Navigate to="/admin/dashboard" /> }
];

// Fallback route for 404
export const fallbackRoute: RouteObject = {
  path: '*',
  element: <NotFound />
};
