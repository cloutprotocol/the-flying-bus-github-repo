
import { adminRoutes } from './adminRoutes';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';

export const appRoutes = [
  ...publicRoutes,
  ...authRoutes,
  ...adminRoutes
];
