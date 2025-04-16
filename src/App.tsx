
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
import { configureLogger, LogLevel, logger, LogSource } from '@/utils/loggerService';
import '@/styles/index';

function App() {
  // Configure logger on app initialization
  useEffect(() => {
    // Configure global logger settings
    configureLogger({
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      consoleOutput: true,
      toastOutput: false,
      persistToStorage: true,
      sendToServer: true
    });
    
    // Log application start
    logger.info(LogSource.CLIENT, 'Application initialized', {
      version: '1.0.0',
      environment: import.meta.env.MODE,
      buildTime: new Date().toISOString()
    });
    
    // Log errors not caught elsewhere
    const originalError = console.error;
    console.error = (...args) => {
      // Log to our system first
      logger.error(LogSource.CLIENT, 'Uncaught console error', args);
      // Then call the original console.error
      originalError.apply(console, args);
    };
    
    // Set up global error handler
    window.addEventListener('error', (event) => {
      logger.error(LogSource.CLIENT, 'Uncaught global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      logger.error(LogSource.CLIENT, 'Unhandled promise rejection', {
        reason: event.reason
      });
    });
    
    return () => {
      // Restore original console.error on cleanup
      console.error = originalError;
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Main Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/articles/:articleId" element={<ArticlePage />} />
        
        {/* Category Routes - Handle both with and without trailing slash */}
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/headliners" element={<CategoryPage />} />
        <Route path="/debates" element={<CategoryPage />} />
        <Route path="/spice-it-up" element={<CategoryPage />} />
        <Route path="/in-the-neighborhood" element={<CategoryPage />} />
        <Route path="/learning" element={<CategoryPage />} />
        <Route path="/school-news" element={<CategoryPage />} />
        
        {/* Storyboard Routes */}
        <Route path="/storyboard/:seriesId" element={<StoryboardPage />} />
        <Route path="/storyboard" element={<StoryboardCategoryPage />} />
        <Route path="/storyboard/:seriesId/episode/:episodeId" element={<StoryboardEpisodePage />} />
        <Route path="/about" element={<About />} />
        
        {/* Auth Routes */}
        <Route path="/reader-auth" element={<ReaderAuth />} />
        
        {/* Profile Routes */}
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route 
          path="/profile/edit" 
          element={
            <ProtectedRoute>
              <ProfileEditPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
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
        
        {/* Content Approval Routes */}
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
        
        {/* Moderation Routes */}
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
        
        {/* Analytics Routes */}
        <Route 
          path="/admin/analytics" 
          element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback Routes */}
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
