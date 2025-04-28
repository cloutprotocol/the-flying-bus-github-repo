
import { adminRoutes } from './adminRoutes';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { devRoutes } from './devRoutes';

// Only include development routes in non-production environments
const isDevelopment = import.meta.env.DEV;

export const appRoutes = [
  ...publicRoutes,
  ...authRoutes,
  ...adminRoutes,
  ...(isDevelopment ? devRoutes : []) // Only include dev routes in development
];
