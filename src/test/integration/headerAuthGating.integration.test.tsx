import React from 'react';
import { render, screen, rerender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeaderButtons } from '@/components/ui/header-buttons';

// Dynamic convex auth state we can flip during the test
let convexState = { isAuthenticated: false, isLoading: true };

vi.mock('convex/react', () => ({
  useConvexAuth: () => convexState,
}));

// Mock DrawerAuth to just render its trigger so button text is present
vi.mock('@/components/ui/drawer-auth', () => ({
  DrawerAuth: ({ triggerComponent }: { triggerComponent: React.ReactNode }) => (
    <div data-testid="drawer-auth">{triggerComponent}</div>
  ),
}));

// Provide a stable user via legacy context so name renders when authed
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isLoading: false,
    isInitialized: true,
    currentUser: { display_name: 'Tester' },
  }),
}));

describe('HeaderButtons integration with Convex auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convexState = { isAuthenticated: false, isLoading: true };
  });

  it('flips from loading -> authed UI when Convex auth updates', async () => {
    const view = render(<HeaderButtons />);

    // Initial loading state
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // Simulate Convex auth becoming authenticated
    convexState = { isAuthenticated: true, isLoading: false };
    view.rerender(<HeaderButtons />);

    // Authenticated UI should render user display name and hide Sign In
    expect(await screen.findByText('Tester')).toBeInTheDocument();
    expect(screen.queryByText(/Sign In/i)).not.toBeInTheDocument();
  });
});

