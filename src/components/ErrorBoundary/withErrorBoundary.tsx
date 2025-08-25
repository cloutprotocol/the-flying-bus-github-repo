import React, { ComponentType } from 'react';
import { AdminErrorBoundary } from './AdminErrorBoundary';

interface WithErrorBoundaryOptions {
  section?: string;
  fallback?: React.ComponentType<{error: Error, retry: () => void}>;
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const WrappedComponent = (props: P) => (
    <AdminErrorBoundary
      section={options.section}
      fallback={options.fallback}
    >
      <Component {...props} />
    </AdminErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default withErrorBoundary;