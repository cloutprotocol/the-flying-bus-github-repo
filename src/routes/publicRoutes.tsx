
import { Navigate } from 'react-router-dom';
import Index from '@/pages/Index';
import About from '@/pages/About';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import StoryboardPage from '@/pages/StoryboardPage';
import StoryboardCategoryPage from '@/pages/StoryboardCategoryPage';
import StoryboardEpisodePage from '@/pages/StoryboardEpisodePage';
import PublicProfile from '@/pages/PublicProfile';
import Settings from '@/pages/Settings';

export const publicRoutes = [
  { path: "/", element: <Index /> },
  { path: "/about", element: <About /> },
  { path: "/article/:slug", element: <ArticlePage /> },
  
  // Direct category routes matching the navigation URLs
  { path: "/headliners", element: <CategoryPage /> },
  { path: "/debates", element: <CategoryPage /> },
  { path: "/spice-it-up", element: <CategoryPage /> },
  { path: "/neighborhood", element: <CategoryPage /> },
  { path: "/learning", element: <CategoryPage /> },
  { path: "/school-news", element: <CategoryPage /> },
  
  // Generic category route as fallback
  { path: "/category/:categorySlug", element: <CategoryPage /> },
  
  { path: "/storyboard", element: <StoryboardPage /> },
  { path: "/storyboard/:seriesSlug", element: <StoryboardCategoryPage /> },
  { path: "/storyboard/:seriesSlug/:episodeSlug", element: <StoryboardEpisodePage /> },
  { path: "/profile/:username", element: <PublicProfile /> },
  { path: "/settings", element: <Settings /> },
  { path: "*", element: <Navigate to="/" /> },
];
