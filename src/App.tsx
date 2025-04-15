
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import '@/styles/index';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/articles/:articleId" element={<ArticlePage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
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
        <Route path="/admin" element={<AdminPortalIndex />} />
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
        
        {/* New Admin Routes */}
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
        
        {/* Fallback Routes */}
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
