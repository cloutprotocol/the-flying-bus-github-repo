# Registration Flow Coordinator Service

## Overview

The Registration Flow Coordinator service orchestrates complete registration processes for both standard and invitation-based flows. It provides rollback mechanisms for failed registration attempts and coordinates between authentication, profile creation, and session management.

## Key Features

### 1. Orchestrated Registration Process
- **Standard Registration**: Coordinates user account creation, profile setup, and session establishment
- **Invitation Registration**: Handles invitation token validation, author account creation, and permission assignment
- **Transaction Management**: Tracks registration steps and provides rollback capabilities

### 2. Rollback Mechanisms
- **Step-by-Step Rollback**: Reverses completed steps in case of failure
- **Audit Trail**: Maintains detailed logs of rollback operations
- **Graceful Degradation**: Handles partial failures without leaving orphaned data

### 3. Error Handling and Recovery
- **Comprehensive Error Processing**: Integrates with registration error handler
- **Retry Logic**: Built-in retry mechanisms for transient failures
- **User-Friendly Messages**: Converts technical errors to actionable user feedback

## Architecture

### Core Components

1. **RegistrationFlowCoordinator**: Main orchestration service
2. **RegistrationTransaction**: Tracks individual registration attempts
3. **RegistrationStep**: Represents atomic operations within a transaction
4. **Rollback Actions**: Cleanup functions for each step

### Integration Points

- **RLS Policy Manager**: For secure profile creation
- **Registration Error Handler**: For error processing and retry logic
- **Auth Service**: Updated to use coordinator for all registrations
- **Invitation Service**: Coordinates with invitation token management

## Usage

### Standard Registration

```typescript
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';

const result = await registrationFlowCoordinator.coordinateStandardRegistration({
  email: 'user@example.com',
  password: 'password123',
  username: 'username',
  displayName: 'Display Name'
});

if (result.success) {
  // Registration completed successfully
  console.log('User:', result.user);
  console.log('Session:', result.session);
} else {
  // Handle registration failure
  console.error('Error:', result.error);
  if (result.rollbackPerformed) {
    console.log('Rollback details:', result.rollbackDetails);
  }
}
```

### Invitation Registration

```typescript
const result = await registrationFlowCoordinator.coordinateInvitationRegistration({
  email: 'author@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  invitationToken: 'invitation-token-123'
});
```

## Registration Steps

### Standard Registration Flow

1. **Create User Account**: Supabase auth signup
2. **Create User Profile**: Profile creation with proper permissions
3. **Establish Session**: Session management and validation

### Invitation Registration Flow

1. **Validate Invitation Token**: Token validation and expiration check
2. **Create User Account**: Supabase auth signup with invitation context
3. **Create Author Profile**: Author profile with elevated permissions
4. **Mark Token Used**: Update invitation token status

## Rollback Strategy

Each step includes a rollback action that can be executed if subsequent steps fail:

- **User Account**: Limited rollback (Supabase doesn't provide direct deletion)
- **Profile Creation**: Delete created profile records
- **Token Status**: Restore invitation token to pending state

## Error Handling

The coordinator integrates with the registration error handler to provide:

- **Categorized Errors**: Different handling for validation, RLS, network, and system errors
- **Retry Logic**: Automatic retries for recoverable failures
- **User Feedback**: Clear, actionable error messages for users
- **Technical Details**: Detailed error information for debugging

## Monitoring and Debugging

### Transaction Tracking

```typescript
// Get active transactions
const activeTransactions = registrationFlowCoordinator.getActiveTransactions();

// Get specific transaction
const transaction = registrationFlowCoordinator.getTransaction('transaction-id');
```

### Logging

The coordinator provides comprehensive logging at each step:
- Transaction start/completion
- Step execution and status changes
- Error details and rollback operations
- Performance metrics

## Testing

The service includes comprehensive unit tests covering:

- **Successful Registration Flows**: Both standard and invitation scenarios
- **Error Scenarios**: Various failure modes and recovery
- **Rollback Mechanisms**: Verification of cleanup operations
- **Integration Points**: Mocking of dependent services

## Requirements Satisfied

This implementation satisfies the following requirements from the auth flow improvements spec:

- **1.1**: Standard sign-up with auto-login coordination
- **3.1**: Invitation-based author registration coordination
- **5.1**: Consistent authentication state management
- **6.5**: Comprehensive error handling and rollback mechanisms

## Future Enhancements

Potential improvements for the coordinator:

1. **Metrics Collection**: Registration success rates and performance tracking
2. **Advanced Rollback**: More sophisticated cleanup strategies
3. **Parallel Processing**: Concurrent execution of independent steps
4. **Configuration**: Customizable retry policies and timeouts