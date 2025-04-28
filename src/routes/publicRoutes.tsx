
import Index from '@/pages/Index';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import StoryboardPage from '@/pages/StoryboardPage';
import StoryboardCategoryPage from '@/pages/StoryboardCategoryPage';
import StoryboardEpisodePage from '@/pages/StoryboardEpisodePage';
import NotFound from '@/pages/NotFound';
import About from '@/pages/About';
import ReaderAuth from '@/pages/ReaderAuth';

export const publicRoutes = [
  { path: "/", element: <Index /> },
  { path: "/articles/:articleId", element: <ArticlePage /> },
  { path: "/category/:categoryId", element: <CategoryPage /> },
  { path: "/headliners", element: <CategoryPage /> },
  { path: "/debates", element: <CategoryPage /> },
  { path: "/spice-it-up", element: <CategoryPage /> },
  { path: "/in-the-neighborhood", element: <CategoryPage /> },
  { path: "/learning", element: <CategoryPage /> },
  { path: "/school-news", element: <CategoryPage /> },
  { path: "/storyboard/:seriesId", element: <StoryboardPage /> },
  { path: "/storyboard", element: <StoryboardCategoryPage /> },
  { path: "/storyboard/:seriesId/episode/:episodeId", element: <StoryboardEpisodePage /> },
  { path: "/about", element: <About /> },
  { path: "/reader-auth", element: <ReaderAuth /> },
  { path: "*", element: <NotFound /> }
];
