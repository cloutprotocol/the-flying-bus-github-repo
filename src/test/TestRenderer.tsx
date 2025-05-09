import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/providers/AuthProvider';
import { ValidationProvider } from '@/providers/ValidationProvider';
import { vi } from 'vitest';

// Sample user for testing
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  username: 'testuser',
  role: 'reader',
  avatar: '/avatar-placeholder.png',
  bio: 'Test bio'
};

// Mock authentication context
const defaultAuthContext = {
  currentUser: null,
  isLoggedIn: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkRoleAccess: vi.fn().mockReturnValue(false),
  session: null,
  user: null
};

interface TestWrapperProps {
  children: React.ReactNode;
  authenticated?: boolean;
  role?: 'reader' | 'author' | 'moderator' | 'admin';
  queryClient?: QueryClient;
}

// Wrapper that provides all necessary providers for testing
function TestWrapper({
  children,
  authenticated = false,
  role = 'reader',
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}: TestWrapperProps) {
  // Configure auth context based on authentication status
  const authContextValue = authenticated
    ? {
        ...defaultAuthContext,
        currentUser: { ...testUser, role },
        isLoggedIn: true,
        checkRoleAccess: vi.fn().mockImplementation((allowedRoles) => allowedRoles.includes(role)),
        session: { user: { id: testUser.id } }
      }
    : defaultAuthContext;

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authContextValue}>
          <ValidationProvider>
            {children}
            <Toaster />
          </ValidationProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

// Custom render method that wraps component with all necessary providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    authenticated?: boolean;
    role?: 'reader' | 'author' | 'moderator' | 'admin';
    queryClient?: QueryClient;
  }
) {
  const {
    authenticated = false,
    role = 'reader',
    queryClient,
    ...renderOptions
  } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper authenticated={authenticated} role={role} queryClient={queryClient}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render method
export { customRender as render };
