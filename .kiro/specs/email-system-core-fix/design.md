# Design Document

## Overview

The email system core fix addresses the fundamental authentication and configuration issues preventing database triggers from successfully calling Edge Functions. The design focuses on properly configuring the service role key, fixing the database trigger authentication, and ensuring reliable fallback mechanisms.

## Architecture

### Current Problem Analysis

1. **Database Configuration Issue**: The `system_configuration` table contains a placeholder service role key instead of the actual key
2. **Authentication Failure**: Database triggers cannot authenticate with Edge Functions due to invalid credentials
3. **Configuration Access**: Database functions are trying to use `current_setting()` but should use the `system_configuration` table
4. **Fallback Mechanism**: Client-side fallbacks are not properly handling authentication and environment variables

### Proposed Solution Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │   Database       │    │  Edge Functions │
│                 │    │                  │    │                 │
│ 1. Submit Form  │───▶│ 2. Insert Record │    │                 │
│                 │    │ 3. Trigger Fires │───▶│ 4. Send Email   │
│                 │    │                  │    │                 │
│ 5. Fallback     │◄───│ 6. If Trigger    │    │                 │
│    (if needed)  │    │    Fails         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Database Configuration Management

**Component**: Enhanced configuration system with proper service role key management

**Interface**:
```sql
-- Function to securely update service role key
update_service_role_key(new_key text) -> boolean

-- Function to validate configuration
validate_email_configuration() -> json

-- Function to get configuration safely
get_config_setting(key text) -> text
```

### 2. Enhanced Database Triggers

**Component**: Updated trigger functions with proper authentication and error handling

**Interface**:
```sql
-- Updated trigger function with proper config access
send_confirmation_email() -> trigger

-- Updated trigger function with proper config access  
send_invitation_email() -> trigger
```

### 3. Improved RPC Functions

**Component**: Enhanced RPC functions with better error handling and authentication

**Interface**:
```sql
-- Enhanced RPC with proper authentication
send_confirmation_email_rpc(invitation_id uuid) -> json

-- Enhanced RPC with proper authentication
send_invitation_email_rpc(invitation_id uuid) -> json
```

### 4. Robust Client-Side Fallback

**Component**: Improved fallback mechanism using Supabase SDK instead of direct fetch calls

**Interface**:
```typescript
// Enhanced fallback using supabase.functions.invoke()
sendConfirmationEmailFallback(invitationId: string, data: any) -> ServiceResponse

// Enhanced fallback using supabase.functions.invoke()
sendInvitationEmailFallback(invitationId: string, data: any) -> ServiceResponse
```

### 5. Supabase SDK Integration

**Component**: Replace direct fetch calls with proper Supabase SDK methods

**Current Problem**:
```typescript
// PROBLEMATIC: Direct fetch calls can cause CORS issues
const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify(emailData)
});
```

**Proposed Solution**:
```typescript
// CORRECT: Use Supabase SDK for proper authentication and CORS handling
const { data, error } = await supabase.functions.invoke('send-email', {
  body: emailData
});
```

## Data Models

### System Configuration Table
```sql
CREATE TABLE system_configuration (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  is_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Email Event Logging
```sql
-- Enhanced logging for email events
CREATE TABLE email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES invitation_requests(id),
  event_type text NOT NULL, -- 'trigger_attempt', 'fallback_attempt', 'success', 'failure'
  method text NOT NULL, -- 'database_trigger', 'rpc_call', 'client_fallback'
  success boolean NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Error Handling

### 1. Database Trigger Error Handling
- Graceful handling of authentication failures
- Proper logging of configuration issues
- Fallback to RPC method if direct trigger fails

### 2. RPC Function Error Handling
- Validation of input parameters
- Proper authentication with Edge Functions
- Detailed error reporting for debugging

### 3. Client-Side Error Handling
- Retry logic with exponential backoff
- Proper authentication using service role key
- Comprehensive error logging and user feedback

### 4. Configuration Validation
- Startup validation of all required configuration
- Runtime validation before email operations
- Clear error messages for missing or invalid configuration

## Testing Strategy

### 1. Configuration Testing
- Test service role key validation
- Test configuration retrieval functions
- Test configuration update mechanisms

### 2. Database Trigger Testing
- Test trigger execution with valid configuration
- Test trigger failure scenarios
- Test trigger authentication with Edge Functions

### 3. RPC Function Testing
- Test RPC calls with proper authentication
- Test RPC error handling and fallback
- Test RPC parameter validation

### 4. Integration Testing
- End-to-end email sending from form submission
- Test fallback mechanisms under various failure conditions
- Test email delivery and timestamp updates

### 5. Edge Function Testing
- Test Edge Function authentication
- Test email template generation
- Test Resend API integration

## Security Considerations

### 1. Service Role Key Management
- Secure storage of service role key in database
- Proper access controls for configuration table
- Encryption of sensitive configuration values

### 2. Authentication Flow
- Proper service role authentication for database triggers
- Secure token passing to Edge Functions
- Validation of authentication credentials

### 3. Access Control
- RLS policies on configuration table
- Proper function permissions
- Audit logging of configuration changes

## Performance Considerations

### 1. Database Trigger Performance
- Asynchronous email sending to avoid blocking transactions
- Proper indexing on email event tables
- Efficient configuration retrieval

### 2. Fallback Performance
- Timeout handling for failed trigger attempts
- Efficient retry mechanisms
- Connection pooling for HTTP requests

### 3. Monitoring and Alerting
- Real-time monitoring of email success rates
- Alerting on configuration issues
- Performance metrics for email delivery times