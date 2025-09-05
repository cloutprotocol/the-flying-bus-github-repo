
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
import ReaderAuth from '@/pages/ReaderAuth';
import RequestInvitation from '@/pages/RequestInvitation';
import InvitationActivate from '@/pages/InvitationActivate';
import InvitationActivateAccount from '@/pages/InvitationActivateAccount';
import InvitationRegister from '@/pages/InvitationRegister';
import InvitationError from '@/pages/InvitationError';

export const publicRoutes = [
  { path: "/", element: <Index /> },
  { path: "/about", element: <About /> },
  { path: "/article/:slug", element: <ArticlePage /> },
  { path: "/reader-auth", element: <ReaderAuth /> },
  { path: "/request-invitation", element: <RequestInvitation /> },
  
  // Invitation activation routes
  { path: "/invitation/activate", element: <InvitationActivate /> },
  { path: "/invitation/activate-account", element: <InvitationActivateAccount /> },
  { path: "/invitation/register", element: <InvitationRegister /> },
  { path: "/invitation/error", element: <InvitationError /> },
  
  // Direct category routes matching the navigation URLs
  { path: "/headliners", element: <CategoryPage /> },
  { path: "/debates", element: <CategoryPage /> },
  { path: "/spice-it-up", element: <CategoryPage /> },
  { path: "/neighborhood", element: <CategoryPage /> },
  { path: "/learning", element: <CategoryPage /> },
  { path: "/school-news", element: <CategoryPage /> },
  
  // Generic category route as fallback
  { path: "/category/:categorySlug", element: <CategoryPage /> },
  
  { path: "/storyboard", element: <StoryboardCategoryPage /> },
  { path: "/storyboard/:seriesId", element: <StoryboardPage /> },
  { path: "/storyboard/:seriesId/episode/:episodeId", element: <StoryboardEpisodePage /> },
  { path: "/profile/:username", element: <PublicProfile /> },
  { path: "/settings", element: <Settings /> },
  { path: "*", element: <Navigate to="/" /> },
];
