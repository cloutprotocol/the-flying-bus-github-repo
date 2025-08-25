# Authentication Context Management Tests

This directory contains comprehensive tests for the enhanced authentication context management system.

## Test Files

### AuthProviderEnhanced.test.tsx
Comprehensive tests for the enhanced AuthProvider that covers:

- **Initial Session Loading**: Tests session restoration and profile loading with retry mechanisms
- **Standard Registration Flow**: Tests auto-login registration with error handling
- **Invitation Registration Flow**: Tests invitation-based author registration
- **Login Flow**: Tests login error handling
- **Logout Flow**: Tests logout functionality
- **Session Management**: Tests manual auth state synchronization and profile refresh
- **Auth State Change Handling**: Tests Supabase auth state change listeners
- **Error Handling**: Tests graceful error handling during session establishment
- **Role Access Checking**: Tests role-based access control

### useAuthContextSync.test.tsx
Tests for authentication context synchronization across components:

- **State Synchronization**: Tests that auth state is synchronized across multiple components
- **Manual Synchronization**: Tests manual auth state sync and profile refresh
- **Session Persistence**: Tests session persistence across page reloads and expiration handling
- **Error Recovery**: Tests recovery from network errors and profile loading failures

## Key Features Tested

### Enhanced Registration Flows
- Standard registration with auto-login
- Invitation-based author registration
- Email confirmation handling
- Comprehensive error handling and retry mechanisms

### Session Management
- Centralized session establishment with retry logic
- Profile loading with fallback mechanisms
- Manual auth state synchronization
- Session persistence across page reloads

### Authentication State Synchronization
- Consistent state updates across all components using the auth context
- Real-time synchronization via Supabase auth state change listeners
- Manual synchronization methods for edge cases
- Loading state management during authentication operations

### Error Handling
- Graceful handling of network errors
- Profile loading failure recovery
- Authentication service error handling
- User-friendly error messaging

### Role-Based Access Control
- Role checking functionality
- Support for multiple role types (reader, author, admin)
- Secure role validation

## Test Coverage

The tests cover all requirements from the auth-flow-improvements specification:

- **Requirement 5.1**: Consistent authentication state updates after registration ✅
- **Requirement 5.2**: Session persistence across both registration flows ✅
- **Requirement 5.3**: Authentication state synchronization across components ✅
- **Requirement 5.4**: Auth providers handle new registration flows ✅
- **Requirement 5.5**: Authentication state consistency mechanisms ✅

## Running Tests

```bash
# Run all auth provider tests
npm test -- --run src/providers/__tests__/

# Run context synchronization tests
npm test -- --run src/hooks/__tests__/useAuthContextSync.test.tsx

# Run specific enhanced provider tests
npm test -- --run src/providers/__tests__/AuthProviderEnhanced.test.tsx
```

## Implementation Notes

### Mocking Strategy
- Uses vi.mocked() for proper TypeScript support
- Mocks all external dependencies (Supabase, services, hooks)
- Provides realistic mock data for testing scenarios

### Test Patterns
- Uses React Testing Library for component testing
- Implements proper async/await patterns with waitFor()
- Uses act() for state updates during testing
- Provides comprehensive error scenario testing

### Coverage Areas
- Happy path scenarios for all authentication flows
- Error handling and edge cases
- State synchronization across multiple consumers
- Session management and persistence
- Role-based access control functionality

The test suite ensures that the enhanced authentication context management system works reliably across all supported authentication flows and provides consistent state management throughout the application.