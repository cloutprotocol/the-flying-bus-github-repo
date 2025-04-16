
/**
 * Test Data Helpers
 * Utility functions for generating consistent test data
 */

// Generate UUID function for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a mock article with customizable properties
 */
export function createMockArticle(overrides = {}) {
  return {
    id: generateUUID(),
    title: 'Test Article',
    content: 'This is test article content',
    slug: 'test-article',
    published_at: new Date().toISOString(),
    status: 'published',
    category_id: generateUUID(),
    author_id: generateUUID(),
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
    id: generateUUID(),
    content: 'This is a test comment',
    article_id: generateUUID(),
    user_id: generateUUID(),
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
    id: generateUUID(),
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
export function createMockSession(userId = generateUUID()) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId
    }
  };
}
