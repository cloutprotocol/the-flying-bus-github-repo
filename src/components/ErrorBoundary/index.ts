// Main error boundary component
export { default as ErrorBoundary } from './ErrorBoundary';

// Admin-specific error boundaries
export { AdminErrorBoundary } from './AdminErrorBoundary';
export { 
  MetricsErrorBoundary,
  ActivitiesErrorBoundary,
  ArticlesErrorBoundary
} from './DashboardSectionErrorBoundary';

// Error boundary utilities
export { default as withErrorBoundary } from './withErrorBoundary';
export { 
  AdminDashboardErrorProvider,
  useAdminError
} from './AdminDashboardErrorProvider';

// Error recovery hook
export { useErrorRecovery } from '../../hooks/useErrorRecovery';