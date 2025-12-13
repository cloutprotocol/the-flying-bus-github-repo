import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../../providers/AuthProvider';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import React, { useContext } from 'react';

// Mock convex-dev/auth
vi.mock("@convex-dev/auth/react", () => ({
    useAuthActions: vi.fn(),
}));

// Mock convex/react
vi.mock("convex/react", () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useConvexAuth: vi.fn(),
}));

// Mock internal imports
vi.mock("@/utils/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {}
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

describe('Convex AuthProvider Integration', () => {
    const mockSignIn = vi.fn();
    const mockSignOut = vi.fn();
    const mockEnsureProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthActions as any).mockReturnValue({
            signIn: mockSignIn,
            signOut: mockSignOut,
        });
        (useMutation as any).mockReturnValue(mockEnsureProfile);
    });

    it('should provide login function that calls signIn', async () => {
        // Setup authenticated state (false initially)
        (useConvexAuth as any).mockReturnValue({ isAuthenticated: false, isLoading: false });
        (useQuery as any).mockReturnValue(null); // No profile yet

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useContext(AuthContext), { wrapper });

        await act(async () => {
            await result.current?.login('test@example.com', 'password123');
        });

        expect(mockSignIn).toHaveBeenCalledWith("password", {
            email: 'test@example.com',
            password: 'password123',
            flow: 'signIn'
        });
        expect(mockEnsureProfile).toHaveBeenCalled();
    });

    it('should provide register function that calls signIn with signUp flow', async () => {
        (useConvexAuth as any).mockReturnValue({ isAuthenticated: false, isLoading: false });
        (useQuery as any).mockReturnValue(null);

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useContext(AuthContext), { wrapper });

        await act(async () => {
            await result.current?.register('new@example.com', 'password123', 'newuser', 'New User');
        });

        expect(mockSignIn).toHaveBeenCalledWith("password", {
            email: 'new@example.com',
            password: 'password123',
            flow: 'signUp'
        });
        expect(mockEnsureProfile).toHaveBeenCalled();
    });

    it('should expose currentUser when profile query returns data', () => {
        const mockProfile = {
            _id: '123',
            email: 'user@example.com',
            role: 'reader',
            username: 'testuser',
            display_name: 'Test User',
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
        };

        (useConvexAuth as any).mockReturnValue({ isAuthenticated: true, isLoading: false });
        (useQuery as any).mockReturnValue(mockProfile);

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useContext(AuthContext), { wrapper });

        expect(result.current?.currentUser).toEqual({
            id: '123',
            email: 'user@example.com',
            role: 'reader',
            username: 'testuser',
            display_name: 'Test User',
            bio: '',
            avatar_url: '',
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
            public_bio: undefined,
            crypto_wallet_address: undefined,
            badge_display_preferences: undefined,
            favorite_categories: undefined,
        });
        expect(result.current?.isLoggedIn).toBe(true);
    });
});
