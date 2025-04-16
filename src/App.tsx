
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
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
import { LogLevel, LogSource } from '@/utils/logger/types';
import { configureLogger } from '@/utils/logger/config';
import { logger } from '@/utils/logger/logger';
import '@/styles/index';
import { ValidationProvider } from './providers/ValidationProvider';

function App() {
  useEffect(() => {
    configureLogger({
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      consoleOutput: true,
      toastOutput: false,
      persistToStorage: true,
      sendToServer: true
    });
    
    logger.info(LogSource.APP, 'Application initialized', {
      version: '1.0.0',
      environment: import.meta.env.MODE,
      buildTime: new Date().toISOString()
    });
    
    const originalError = console.error;
    console.error = (...args) => {
      logger.error(LogSource.APP, 'Uncaught console error', args);
      originalError.apply(console, args);
    };
    
    window.addEventListener('error', (event) => {
      logger.error(LogSource.APP, 'Uncaught global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logger.error(LogSource.APP, 'Unhandled promise rejection', {
        reason: event.reason
      });
    });
    
    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <ValidationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/articles/:articleId" element={<ArticlePage />} />
          
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/headliners" element={<CategoryPage />} />
          <Route path="/debates" element={<CategoryPage />} />
          <Route path="/spice-it-up" element={<CategoryPage />} />
          <Route path="/in-the-neighborhood" element={<CategoryPage />} />
          <Route path="/learning" element={<CategoryPage />} />
          <Route path="/school-news" element={<CategoryPage />} />
          
          <Route path="/storyboard/:seriesId" element={<StoryboardPage />} />
          <Route path="/storyboard" element={<StoryboardCategoryPage />} />
          <Route path="/storyboard/:seriesId/episode/:episodeId" element={<StoryboardEpisodePage />} />
          <Route path="/about" element={<About />} />
          
          <Route path="/reader-auth" element={<ReaderAuth />} />
          
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route 
            path="/profile/edit" 
            element={
              <ProtectedRoute>
                <ProfileEditPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPortalIndex />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/articles" 
            element={
              <ProtectedRoute>
                <MyArticles />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/articles/new" 
            element={
              <ProtectedRoute>
                <ArticleEditor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/articles/:articleId" 
            element={
              <ProtectedRoute>
                <ArticleEditor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/media" 
            element={
              <ProtectedRoute>
                <MediaManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/approval-queue" 
            element={
              <ProtectedRoute>
                <ApprovalQueue />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reviews/:articleId" 
            element={
              <ProtectedRoute>
                <ArticleReview />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/comment-moderation" 
            element={
              <ProtectedRoute>
                <CommentModeration />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/content-flagging" 
            element={
              <ProtectedRoute>
                <ContentFlagging />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/report-management" 
            element={
              <ProtectedRoute>
                <ReportManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ValidationProvider>
  );
}

export default App;
