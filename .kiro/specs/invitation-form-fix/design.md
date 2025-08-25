# Design Document

## Overview

The invitation form submission failure is caused by missing database configuration parameters that are required by database triggers and functions. The system attempts to use `current_setting('app.supabase_url')` and `current_setting('app.service_role_key')` but these parameters haven't been set in the database. This design addresses the root cause by implementing proper configuration management and fallback mechanisms.

## Architecture

### Current Problem
- Database triggers in `20250819000002_email_triggers.sql` and functions in `20250819000003_email_functions.sql` reference `app.supabase_url` configuration parameter
- These parameters are commented out in the migration files and never actually set
- When triggers execute, they fail with "unrecognized configuration parameter" error
- This prevents invitation requests from being saved and processed

### Solution Architecture
1. **Database Configuration Setup**: Set required configuration parameters in the database
2. **Fallback Mechanisms**: Implement client-side fallbacks when database triggers fail
3. **Error Handling**: Improve error handling to prevent complete form submission failure
4. **Configuration Management**: Create a systematic approach to manage database configuration

## Components and Interfaces

### 1. Database Configuration Component
**Purpose**: Ensure required configuration parameters are set in the database

**Implementation**:
- Create a new migration to set the configuration parameters
- Use the correct project URL and service role key from environment
- Ensure parameters are set at the database level using `ALTER DATABASE`

### 2. Enhanced Invitation Service
**Purpose**: Provide robust invitation request handling with fallbacks

**Key Methods**:
- `createInvitationRequest()` - Enhanced with better error handling
- `handleDatabaseTriggerFailure()` - Fallback when triggers fail
- `sendConfirmationEmailFallback()` - Direct email sending when triggers fail

### 3. Database Trigger Improvements
**Purpose**: Make triggers more resilient to configuration issues

**Enhancements**:
- Add error handling for missing configuration
- Implement graceful degradation when parameters are unavailable
- Log errors instead of failing completely

### 4. Migration Strategy
**Purpose**: Apply fixes without disrupting existing data

**Approach**:
- Create new migration to set configuration parameters
- Update existing functions to handle missing configuration gracefully
- Ensure backward compatibility

## Data Models

### Configuration Parameters
```sql
-- Database-level configuration
app.supabase_url = 'https://sutvexycbiiarpkugzpv.supabase.co'
app.service_role_key = '[service_role_key_from_env]'
```

### Enhanced Error Logging
```sql
-- Add to existing email_events table
error_details JSONB -- Store detailed error information
fallback_used BOOLEAN -- Track when fallbacks were used
```

## Error Handling

### Database Trigger Errors
1. **Configuration Missing**: Use `current_setting('app.supabase_url', true)` with default handling
2. **Network Failures**: Log error and continue processing
3. **Authentication Issues**: Fall back to client-side email sending

### Client-Side Error Handling
1. **Database Insert Success + Trigger Failure**: Show success message, handle email separately
2. **Complete Database Failure**: Show appropriate error message with retry option
3. **Partial Failures**: Provide detailed feedback to user

### Fallback Mechanisms
1. **Primary**: Database triggers send emails automatically
2. **Fallback 1**: Client-side direct Edge Function calls
3. **Fallback 2**: Admin notification for manual processing

## Testing Strategy

### Database Configuration Tests
- Verify configuration parameters are set correctly
- Test trigger execution with proper configuration
- Validate fallback behavior when configuration is missing

### Integration Tests
- End-to-end invitation form submission
- Email sending through various pathways
- Error handling scenarios

### Edge Cases
- Missing configuration parameters
- Network connectivity issues
- Invalid email addresses
- Rate limiting scenarios

## Implementation Approach

### Phase 1: Database Configuration Fix
1. Create migration to set required configuration parameters
2. Update database triggers to handle missing configuration gracefully
3. Test configuration setup

### Phase 2: Enhanced Error Handling
1. Improve invitation service error handling
2. Implement client-side fallbacks
3. Add comprehensive logging

### Phase 3: Testing and Validation
1. Test all invitation submission scenarios
2. Verify email sending works correctly
3. Validate error handling and fallbacks

## Security Considerations

### Configuration Security
- Store service role key securely in database configuration
- Ensure configuration parameters are only accessible to authorized functions
- Use environment variables for sensitive configuration

### Error Information Exposure
- Avoid exposing sensitive configuration details in error messages
- Log detailed errors server-side only
- Provide user-friendly error messages

## Performance Considerations

### Database Triggers
- Minimize trigger execution time
- Use asynchronous processing where possible
- Implement timeout handling for external calls

### Fallback Performance
- Cache configuration parameters
- Optimize client-side fallback calls
- Implement retry logic with exponential backoff