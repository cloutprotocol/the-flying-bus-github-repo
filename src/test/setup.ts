import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock React
global.React = require('react');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Mock performance API
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now())
};

// Setup global test utilities
global.testUtils = {
  createMockUser: (role: string, overrides = {}) => ({
    id: `${role}-123`,
    email: `${role}@example.com`,
    role,
    username: `${role}_user`,
    display_name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
    bio: '',
    avatar_url: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),
  
  createMockArticle: (authorId: string, overrides = {}) => ({
    id: 'article-123',
    title: 'Test Article',
    content: 'Test content',
    author_id: authorId,
    status: 'draft',
    category: 'learning',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    can_edit: true,
    ...overrides
  }),
  
  createMockInvitationToken: (overrides = {}) => ({
    id: 'token-123',
    email: 'test@example.com',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    used_at: null,
    used_by: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  })
};

// Declare global types for TypeScript
declare global {
  var testUtils: {
    createMockUser: (role: string, overrides?: any) => any;
    createMockArticle: (authorId: string, overrides?: any) => any;
    createMockInvitationToken: (overrides?: any) => any;
  };
}