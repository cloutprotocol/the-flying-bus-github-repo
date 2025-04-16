
# Service Tests

This directory contains unit tests for all backend services. 

## Structure

Each service should have its own test file named after the service with the `.test.ts` suffix.
For example: `articleService.test.ts` for the ArticleService.

## Mocking

Services often depend on external resources like databases or APIs. In tests:
- Use the mock Supabase client configured in `src/test/setup.ts`
- Create additional mocks in the test file as needed
- Focus on testing service logic, not the underlying Supabase implementation

## Running Tests

To run service tests specifically:
```
npm test -- services
```
