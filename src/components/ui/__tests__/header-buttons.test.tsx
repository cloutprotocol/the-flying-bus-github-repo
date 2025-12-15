import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeaderButtons } from '@/components/ui/header-buttons';

// Mock UserMenu to avoid pulling its internals
vi.mock('@/components/Auth/UserMenu', () => ({
  default: () => <div data-testid="user-menu">UserMenu</div>,
}));

// Mock DrawerAuth to just render its trigger so button text is present
vi.mock('@/components/ui/drawer-auth', () => ({
  DrawerAuth: ({ triggerComponent }: { triggerComponent: React.ReactNode }) => (
    <div data-testid="drawer-auth">{triggerComponent}</div>
  ),
}));

// Mock Convex auth hook
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

// Mock legacy auth context usage
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isLoading: false,
    isInitialized: true,
    currentUser: null,
  }),
}));

describe('HeaderButtons gating (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading when initial auth is loading and not initialized', () => {
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        isLoggedIn: false,
        isLoading: true,
        isInitialized: false,
        currentUser: null,
      }),
    }));

    const { HeaderButtons: Reloaded } = require('@/components/ui/header-buttons');
    render(<Reloaded />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('shows unauthenticated buttons when not logged in', () => {
    const { HeaderButtons: Reloaded } = require('@/components/ui/header-buttons');
    render(<Reloaded />);
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByText(/Join Us/i)).toBeInTheDocument();
  });

  it('shows authenticated buttons when authed (via legacy context)', () => {
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        isLoggedIn: true,
        isLoading: false,
        isInitialized: true,
        currentUser: { display_name: 'Test User' },
      }),
    }));

    const { HeaderButtons: Reloaded } = require('@/components/ui/header-buttons');
    render(<Reloaded />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByText(/Sign In/i)).not.toBeInTheDocument();
  });
});

