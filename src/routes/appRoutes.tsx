import { adminRoutes } from './adminRoutes';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { WalletDashboardPage } from '../../wallet/WalletDashboardPage';

export const appRoutes = [
  ...publicRoutes,
  ...authRoutes,
  ...adminRoutes,
  {
    path: "/wallet-dashboard",
    element: <WalletDashboardPage />
  },
  // Remove or comment out the old /wallet-test route if not needed
  // {
  //   path: "/wallet-test",
  //   element: <WalletTest />
  // },
];
