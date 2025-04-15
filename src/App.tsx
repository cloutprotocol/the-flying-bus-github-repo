
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import About from '@/pages/About';
import CategoryPage from '@/pages/CategoryPage';
import ArticlePage from '@/pages/ArticlePage';
import NotFound from '@/pages/NotFound';
import StoryboardPage from '@/pages/StoryboardPage';
import StoryboardCategoryPage from '@/pages/StoryboardCategoryPage';
import StoryboardEpisodePage from '@/pages/StoryboardEpisodePage';
import ReaderAuth from '@/pages/ReaderAuth';
import ProfilePage from '@/pages/ProfilePage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import AdminPortalIndex from '@/pages/Admin/AdminPortalIndex';
import Dashboard from '@/pages/Admin/Dashboard';
import MyArticles from '@/pages/Admin/MyArticles';
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from '@/components/Auth/ProtectedRoute';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/reader-auth" element={<ReaderAuth />} />
        
        {/* Profile routes */}
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/profile/:username/edit" element={<ProfileEditPage />} />
        
        <Route path="/:category" element={<CategoryPage />} />
        <Route path="/:category/:articleId" element={<ArticlePage />} />
        
        <Route path="/storyboard" element={<StoryboardPage />} />
        <Route path="/storyboard/:seriesId" element={<StoryboardCategoryPage />} />
        <Route path="/storyboard/:seriesId/:episodeId" element={<StoryboardEpisodePage />} />
        
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
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
