import { Navigate } from 'react-router-dom';
import AdminPortalIndex from '@/pages/Admin/AdminPortalIndex';
import Dashboard from '@/pages/Admin/Dashboard';
import MyArticles from '@/pages/Admin/MyArticles';
import ArticleEditor from '@/pages/Admin/ArticleEditor';
import ArticleTypeSelection from '@/pages/Admin/ArticleTypeSelection';
import MediaManager from '@/pages/Admin/MediaManager';
import UserManagement from '@/pages/Admin/UserManagement';
import ApprovalQueue from '@/pages/Admin/ApprovalQueue';
import ArticleReview from '@/pages/Admin/ArticleReview';
import CommentModeration from '@/pages/Admin/CommentModeration';
import ContentFlagging from '@/pages/Admin/ContentFlagging';
import ReportManagement from '@/pages/Admin/ReportManagement';
import AnalyticsDashboard from '@/pages/Admin/AnalyticsDashboard';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

export const adminRoutes = [
  { 
    path: "/admin", 
    element: <ProtectedRoute><AdminPortalIndex /></ProtectedRoute>
  },
  { 
    path: "/admin/dashboard", 
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  { 
    path: "/admin/articles", 
    element: <ProtectedRoute><MyArticles /></ProtectedRoute>
  },
  { 
    path: "/admin/articles/select-type", 
    element: <ProtectedRoute><ArticleTypeSelection /></ProtectedRoute>
  },
  { 
    path: "/admin/articles/new", 
    element: <ProtectedRoute><ArticleTypeSelection /></ProtectedRoute>
  },
  { 
    path: "/admin/articles/new/:type", 
    element: <ProtectedRoute><ArticleEditor /></ProtectedRoute>
  },
  { 
    path: "/admin/articles/:articleId", 
    element: <ProtectedRoute><ArticleEditor /></ProtectedRoute>
  },
  { 
    path: "/admin/media", 
    element: <ProtectedRoute><MediaManager /></ProtectedRoute>
  },
  { 
    path: "/admin/users", 
    element: <ProtectedRoute><UserManagement /></ProtectedRoute>
  },
  { 
    path: "/admin/approval-queue", 
    element: <ProtectedRoute><ApprovalQueue /></ProtectedRoute>
  },
  { 
    path: "/admin/reviews/:articleId", 
    element: <ProtectedRoute><ArticleReview /></ProtectedRoute>
  },
  { 
    path: "/admin/comment-moderation", 
    element: <ProtectedRoute><CommentModeration /></ProtectedRoute>
  },
  { 
    path: "/admin/content-flagging", 
    element: <ProtectedRoute><ContentFlagging /></ProtectedRoute>
  },
  { 
    path: "/admin/report-management", 
    element: <ProtectedRoute><ReportManagement /></ProtectedRoute>
  },
  { 
    path: "/admin/analytics", 
    element: <ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>
  },
  { path: "/admin/*", element: <Navigate to="/admin/dashboard" /> },
];
