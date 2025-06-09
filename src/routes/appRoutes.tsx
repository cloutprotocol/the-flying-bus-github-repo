import { adminRoutes } from './adminRoutes';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { WalletTest } from '../components/WalletTest';

export const appRoutes = [
  ...publicRoutes,
  ...authRoutes,
  ...adminRoutes,
  {
    path: "/wallet-test",
    element: <WalletTest />
  },
];
