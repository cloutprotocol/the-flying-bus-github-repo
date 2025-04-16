
# Testing Strategy

This document outlines the testing strategy for "The Flying Bus" application.

## Testing Layers

The application uses a multi-layered testing approach:

1. **Unit Tests**: Test individual functions, components, and services in isolation
2. **Integration Tests**: Test interactions between components and services
3. **End-to-End Tests**: Test complete user flows

## Test Organization

- Component tests are located alongside the components they test (`ComponentName.test.tsx`)
- Service tests are in `src/services/__tests__/`
- Utility tests are alongside the utilities they test (`utilityName.test.ts`)
- Test helpers are in `src/test/helpers/`

## Testing Tools

- **Vitest**: Test runner and framework
- **React Testing Library**: Testing React components
- **jsdom**: DOM implementation for testing browser-like environments
- **@testing-library/jest-dom**: Custom DOM element matchers

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only service tests
npm run test:services

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Coverage Goals

- Services: 80%+ coverage
- Components: 70%+ coverage
- Utilities: 90%+ coverage

## Mocking Strategy

- External services are mocked at the module level
- Supabase client is mocked in `src/test/setup.ts`
- Test data helpers are available in `src/test/helpers/testData.ts`

## Best Practices

1. Follow the Arrange-Act-Assert pattern
2. Test behavior, not implementation
3. Write focused, small tests
4. Use descriptive test and variable names
5. Avoid testing third-party code
6. Keep tests independent - no shared state between tests
7. Mock external dependencies consistently
