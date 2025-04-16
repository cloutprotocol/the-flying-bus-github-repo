
/**
 * Test Data Helpers
 * Utility functions for generating consistent test data
 */

import { v4 as uuidv4 } from 'crypto';

/**
 * Generate a mock article with customizable properties
 */
export function createMockArticle(overrides = {}) {
  return {
    id: uuidv4(),
    title: 'Test Article',
    content: 'This is test article content',
    slug: 'test-article',
    published_at: new Date().toISOString(),
    status: 'published',
    category_id: uuidv4(),
    author_id: uuidv4(),
    excerpt: 'Test article excerpt',
    featured: false,
    article_type: 'standard',
    cover_image: 'test-image.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Generate a mock comment with customizable properties
 */
export function createMockComment(overrides = {}) {
  return {
    id: uuidv4(),
    content: 'This is a test comment',
    article_id: uuidv4(),
    user_id: uuidv4(),
    parent_id: null,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Generate a mock user with customizable properties
 */
export function createMockUser(overrides = {}) {
  return {
    id: uuidv4(),
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: '/avatar-placeholder.png',
    bio: 'This is a test user bio',
    role: 'reader',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Generate an auth session with the given user ID
 */
export function createMockSession(userId = uuidv4()) {
  return {
    user: {
      id: userId
    }
  };
}
