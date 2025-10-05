import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AdminErrorBoundary } from './AdminErrorBoundary';

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  section: string | null;
}

interface AdminErrorContextType {
  errorState: ErrorState;
  reportError: (error: Error, section?: string) => void;
  clearError: () => void;
  retrySection: (section: string, retryFn: () => void) => void;
}

const AdminErrorContext = createContext<AdminErrorContextType | null>(null);

export const useAdminError = () => {
  const context = useContext(AdminErrorContext);
  if (!context) {
    throw new Error('useAdminError must be used within AdminDashboardErrorProvider');
  }
  return context;
};

interface AdminDashboardErrorProviderProps {
  children: ReactNode;
}

export const AdminDashboardErrorProvider: React.FC<AdminDashboardErrorProviderProps> = ({ 
  children 
}) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    section: null
  });

  const reportError = useCallback((error: Error, section?: string) => {
    console.error(`Admin Dashboard Error${section ? ` in ${section}` : ''}:`, error);
    
    setErrorState({
      hasError: true,
      error,
      section: section || null
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      section: null
    });
  }, []);

  const retrySection = useCallback((section: string, retryFn: () => void) => {
    console.log(`Retrying section: ${section}`);
    clearError();
    
    // Add small delay to prevent immediate re-error
    setTimeout(() => {
      try {
        retryFn();
      } catch (error) {
        reportError(error as Error, section);
      }
    }, 100);
  }, [clearError, reportError]);

  const contextValue: AdminErrorContextType = {
    errorState,
    reportError,
    clearError,
    retrySection
  };

  return (
    <AdminErrorContext.Provider value={contextValue}>
      <AdminErrorBoundary section="admin dashboard">
        {children}
      </AdminErrorBoundary>
    </AdminErrorContext.Provider>
  );
};

export default AdminDashboardErrorProvider;