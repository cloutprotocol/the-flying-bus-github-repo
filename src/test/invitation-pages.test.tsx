import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InvitationActivate from '@/pages/InvitationActivate';
import InvitationActivateAccount from '@/pages/InvitationActivateAccount';
import InvitationRegister from '@/pages/InvitationRegister';
import InvitationError from '@/pages/InvitationError';

// Mock the services
vi.mock('@/services/invitationService', () => ({
  validateInvitationToken: vi.fn(),
  findUserByEmail: vi.fn(),
  completeInvitation: vi.fn(),
}));

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
  }),
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Invitation Pages', () => {
  it('renders InvitationActivate page', () => {
    renderWithRouter(<InvitationActivate />);
    expect(screen.getByText('Invitation Activation')).toBeInTheDocument();
  });

  it('renders InvitationActivateAccount page', () => {
    renderWithRouter(<InvitationActivateAccount />);
    expect(screen.getByText('Account Activation')).toBeInTheDocument();
  });

  it('renders InvitationRegister page', () => {
    renderWithRouter(<InvitationRegister />);
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('renders InvitationError page with default error', () => {
    renderWithRouter(<InvitationError />);
    expect(screen.getByText('Invitation Issue')).toBeInTheDocument();
  });

  it('renders InvitationError page with expired error type', () => {
    // Mock URLSearchParams to return expired type
    const mockSearchParams = new URLSearchParams('?type=expired');
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      if (key === 'type') return 'expired';
      return null;
    });

    renderWithRouter(<InvitationError />);
    expect(screen.getByText('Invitation Expired')).toBeInTheDocument();
  });
});