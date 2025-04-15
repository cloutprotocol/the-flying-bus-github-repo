
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

// Admin Routes
import AdminPortalIndex from '@/pages/Admin/AdminPortalIndex';
import Dashboard from '@/pages/Admin/Dashboard';
import MyArticles from '@/pages/Admin/MyArticles';

// We'll use the Toaster for notifications
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/reader-auth" element={<ReaderAuth />} />
        
        {/* Category routes */}
        <Route path="/:category" element={<CategoryPage />} />
        <Route path="/:category/:articleId" element={<ArticlePage />} />
        
        {/* Storyboard routes */}
        <Route path="/storyboard" element={<StoryboardPage />} />
        <Route path="/storyboard/:seriesId" element={<StoryboardCategoryPage />} />
        <Route path="/storyboard/:seriesId/:episodeId" element={<StoryboardEpisodePage />} />
        
        {/* Admin portal routes */}
        <Route path="/admin" element={<AdminPortalIndex />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/articles" element={<MyArticles />} />
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
