# Design Document

## Overview

The signup process failure is primarily caused by RLS (Row-Level Security) policy violations during profile creation. The current system attempts to create profiles without proper authentication context, causing the database to reject the operations. This design addresses the core authentication flow, RLS policy configuration, and error handling to restore a functional signup process.

## Architecture

### Current Problem Analysis

Based on the error logs, the issues are:

1. **RLS Policy Violation**: `new row violates row-level security policy for table "profiles"`
2. **Authentication Context**: Profile creation happens before proper auth context is established
3. **Transaction Management**: Failed rollback mechanisms when errors occur
4. **Monitoring Failures**: Registration monitoring can't store data due to similar RLS issues

### Solution Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Signup Form   │───▶│  Auth Service    │───▶│   Supabase      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Registration     │    │ RLS Policies    │
                       │ Coordinator      │    │ & Triggers      │
                       └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Error Handling   │
                       │ & Monitoring     │
                       └──────────────────┘
```

## Components and Interfaces

### 1. RLS Policy Manager

**Purpose**: Ensure RLS policies allow legitimate profile creation during registration

**Key Functions**:
- Validate current RLS policies for profiles table
- Implement service role bypass for system operations
- Ensure proper authentication context during profile creation

**Interface**:
```typescript
interface RLSPolicyManager {
  validateProfileCreationPolicy(): Promise<boolean>;
  createProfileWithServiceRole(userId: string, profileData: any): Promise<void>;
  checkAuthenticationContext(): Promise<AuthContext>;
}
```

### 2. Enhanced Registration Flow Coordinator

**Purpose**: Orchestrate the complete registration process with proper error handling

**Key Functions**:
- Coordinate user creation and profile creation in correct sequence
- Manage authentication context throughout the process
- Handle transaction rollback properly
- Integrate with monitoring systems

**Interface**:
```typescript
interface RegistrationCoordinator {
  coordinateRegistration(userData: UserRegistrationData): Promise<RegistrationResult>;
  handleRegistrationFailure(error: Error, context: RegistrationContext): Promise<void>;
  rollbackRegistration(transactionId: string): Promise<void>;
}
```

### 3. Authentication Service Enhancements

**Purpose**: Ensure proper authentication flow and context management

**Key Functions**:
- Create user accounts with proper authentication context
- Establish session before profile creation
- Handle authentication state transitions
- Manage service role operations when needed

### 4. Database Trigger Improvements

**Purpose**: Ensure profile creation triggers work with RLS policies

**Key Functions**:
- Create profiles using service role context when appropriate
- Handle RLS policy evaluation correctly
- Provide proper error messages for debugging
- Ensure atomic operations

## Data Models

### Registration Transaction

```typescript
interface RegistrationTransaction {
  transactionId: string;
  userId?: string;
  email: string;
  status: 'pending' | 'user_created' | 'profile_created' | 'completed' | 'failed' | 'rolled_back';
  createdAt: Date;
  completedAt?: Date;
  errorDetails?: string;
}
```

### Authentication Context

```typescript
interface AuthContext {
  userId?: string;
  role: 'anon' | 'authenticated' | 'service_role';
  sessionActive: boolean;
  rlsEnabled: boolean;
}
```

## Error Handling

### Error Classification

1. **RLS Policy Errors**: Specific handling for policy violations
2. **Authentication Errors**: Context and session issues
3. **Database Errors**: Connection and constraint violations
4. **Validation Errors**: Input validation failures

### Error Recovery Strategies

1. **Retry with Service Role**: For legitimate operations blocked by RLS
2. **Context Refresh**: Re-establish authentication context
3. **Graceful Degradation**: Fallback to manual profile creation
4. **User Notification**: Clear error messages with next steps

### Error Monitoring

```typescript
interface ErrorMonitoring {
  logRegistrationError(error: RegistrationError): Promise<void>;
  trackErrorPatterns(): Promise<ErrorPattern[]>;
  alertOnCriticalErrors(error: Error): Promise<void>;
}
```

## Testing Strategy

### Unit Tests

1. **RLS Policy Tests**: Verify policies allow legitimate operations
2. **Registration Flow Tests**: Test each step of the registration process
3. **Error Handling Tests**: Verify proper error handling and rollback
4. **Authentication Context Tests**: Ensure proper context management

### Integration Tests

1. **End-to-End Registration**: Complete signup flow testing
2. **Database Integration**: RLS policy and trigger testing
3. **Error Scenario Testing**: Various failure modes
4. **Monitoring Integration**: Verify error tracking works

### Test Data

- Valid user registration data
- Invalid input scenarios
- RLS policy violation scenarios
- Network failure simulations

## Implementation Phases

### Phase 1: RLS Policy Fix
- Analyze and fix RLS policies for profiles table
- Implement service role bypass for system operations
- Add proper authentication context checks

### Phase 2: Registration Flow Enhancement
- Update registration coordinator with proper error handling
- Implement transaction management and rollback
- Add comprehensive logging and monitoring

### Phase 3: Authentication Service Updates
- Ensure proper authentication context during registration
- Handle session establishment correctly
- Add retry mechanisms for transient failures

### Phase 4: Database Improvements
- Update triggers to work with RLS policies
- Add proper error handling in database functions
- Implement atomic operations for profile creation

### Phase 5: Testing and Validation
- Comprehensive testing of the entire signup flow
- Error scenario testing
- Performance and reliability testing
- User acceptance testing

## Security Considerations

1. **RLS Policy Security**: Ensure policies don't create security holes
2. **Service Role Usage**: Limit service role operations to necessary cases
3. **Input Validation**: Maintain strict input validation
4. **Session Security**: Proper session management during registration
5. **Error Information**: Avoid exposing sensitive information in errors

## Performance Considerations

1. **Database Operations**: Minimize database calls during registration
2. **RLS Policy Evaluation**: Optimize policy checks for performance
3. **Error Handling**: Efficient error processing and logging
4. **Monitoring Overhead**: Minimize performance impact of monitoring

## Monitoring and Observability

1. **Registration Metrics**: Success/failure rates, timing
2. **Error Tracking**: Detailed error logs with context
3. **RLS Policy Monitoring**: Track policy violations and patterns
4. **Performance Monitoring**: Registration flow performance metrics
5. **Alerting**: Real-time alerts for critical registration failures