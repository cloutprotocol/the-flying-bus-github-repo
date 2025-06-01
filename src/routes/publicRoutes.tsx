
import React from 'react';
import { categoryRoutes as categoryRoutesConfig } from '@/utils/navigation/categoryRoutes';
import Index from '@/pages/Index';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import StoryboardPage from '@/pages/StoryboardPage';
import StoryboardCategoryPage from '@/pages/StoryboardCategoryPage';
import StoryboardEpisodePage from '@/pages/StoryboardEpisodePage';
import RequestInvitation from '@/pages/RequestInvitation';
import NotFound from '@/pages/NotFound';
import About from '@/pages/About';
import ReaderAuth from '@/pages/ReaderAuth';

// Generate category routes from our configuration
const categoryRoutes = categoryRoutesConfig.map(route => ({
  path: route.path,
  element: <CategoryPage />
}));

export const publicRoutes = [
  { path: "/", element: <Index /> },
  { path: "/articles/:articleId", element: <ArticlePage /> },
  { path: "/category/:categoryId", element: <CategoryPage /> },
  ...categoryRoutes,
  { path: "/storyboard/:seriesId", element: <StoryboardPage /> },
  { path: "/storyboard", element: <StoryboardCategoryPage /> },
  { path: "/storyboard/:seriesId/episode/:episodeId", element: <StoryboardEpisodePage /> },
  { path: "/about", element: <About /> },
  { path: "/request-invitation", element: <RequestInvitation /> },
  { path: "/reader-auth", element: <ReaderAuth /> },
  { path: "*", element: <NotFound /> }
];
