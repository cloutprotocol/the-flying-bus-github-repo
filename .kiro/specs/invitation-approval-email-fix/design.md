# Design Document

## Overview

The invitation approval email fix addresses the core issue where the admin approval process fails to send emails due to CORS errors and Edge Function failures. The current approval process attempts to generate tokens via the `invitation-tokens` Edge Function before sending emails, while the working form submission process calls the `send-email` Edge Function directly. This design aligns both processes to use the same reliable server-side email sending mechanism.

## Architecture

### Current Problem Analysis

1. **Form Submission Flow (WORKING)**:
   ```
   Form Submit → Database Insert → Trigger → send-email Edge Function → Resend API → Email Sent
   ```

2. **Approval Process Flow (BROKEN)**:
   ```
   Admin Approval → Database Update → Client Fallback → invitation-tokens Edge Function → CORS Error
   ```

3. **Root Cause**: The approval process tries to generate tokens client-side before sending emails, causing CORS issues and function failures.

### Proposed Solution Architecture

**Unified Email Flow**:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Action  │    │   Database       │    │  send-email     │
│                 │    │                  │    │  Edge Function  │
│ 1. Approve      │───▶│ 2. Update Status │    │                 │
│    Request      │    │ 3. Trigger Fires │───▶│ 4. Generate     │
│                 │    │                  │    │    Token &      │
│                 │    │                  │    │    Send Email   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Resend API    │
                                               │                 │
                                               │ 5. Email Sent   │
                                               │    to Parent    │
                                               └─────────────────┘
```

## Components and Interfaces

### 1. Enhanced send-email Edge Function

**Component**: Extend the existing `send-email` Edge Function to handle invitation approval emails with token generation

**Current Interface**:
```typescript
// Current send-email function handles basic templates
{
  type: 'invitation_confirmation',
  to: string,
  templateData: { parentName, childName, submissionDate }
}
```

**Enhanced Interface**:
```typescript
// Enhanced to handle invitation approval with token generation
{
  type: 'invitation_approved',
  to: string,
  templateData: { 
    parentName: string,
    childName: string,
    invitationId: string,
    // Token will be generated internally by the Edge Function
  }
}
```

### 2. Modified Invitation Service

**Component**: Update the `sendInvitationEmailFallback` function to use the same pattern as `sendConfirmationEmailFallback`

**Current Problematic Flow**:
```typescript
// BROKEN: Tries to generate token first, then send email
async function sendInvitationEmailFallback(invitationId, invitationData) {
  // 1. Call invitation-tokens function (CAUSES CORS ERROR)
  const tokenResult = await AuthenticatedApiService.generateInvitationToken(...);
  
  // 2. Then try to send email with token
  const emailResult = await AuthenticatedApiService.sendEmail(...);
}
```

**Proposed Fixed Flow**:
```typescript
// FIXED: Send email directly, let Edge Function handle token generation
async function sendInvitationEmailFallback(invitationId, invitationData) {
  // 1. Send email directly via send-email function
  const emailResult = await AuthenticatedApiService.sendEmail({
    type: 'invitation_approved',
    to: invitationData.parent_email,
    templateData: {
      parentName: invitationData.parent_name,
      childName: invitationData.child_name,
      invitationId: invitationId
    }
  });
}
```

### 3. Token Generation Integration

**Component**: Move token generation logic into the `send-email` Edge Function for invitation approval emails

**Implementation**:
```typescript
// Inside send-email Edge Function
if (emailData.type === 'invitation_approved') {
  // 1. Generate token using existing invitation-tokens logic
  const tokenResult = await generateInvitationToken({
    invitationId: emailData.templateData.invitationId,
    email: emailData.to,
    expirationHours: 168
  });
  
  // 2. Add token to template data
  emailData.templateData.invitationToken = tokenResult.token;
  emailData.templateData.invitationUrl = `${baseUrl}/invitation/activate?token=${tokenResult.token}`;
}
```

### 4. Database Trigger Enhancement

**Component**: Ensure database triggers can properly call the enhanced `send-email` function

**Current Trigger Flow**:
```sql
-- Current trigger calls send_invitation_email_rpc
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Calls separate invitation email function
  PERFORM send_invitation_email_rpc(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Enhanced Trigger Flow**:
```sql
-- Enhanced trigger uses unified send-email function
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Calls unified send-email function with invitation_approved type
  PERFORM send_email_via_function(
    'invitation_approved',
    (SELECT parent_email FROM invitation_requests WHERE id = NEW.id),
    json_build_object(
      'parentName', (SELECT parent_name FROM invitation_requests WHERE id = NEW.id),
      'childName', (SELECT child_name FROM invitation_requests WHERE id = NEW.id),
      'invitationId', NEW.id::text
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Data Models

### Enhanced Email Event Logging
```sql
-- Add support for invitation approval email events
INSERT INTO email_events (
  invitation_id,
  event_type, -- 'invitation_approved_sent', 'invitation_approved_failed'
  method, -- 'database_trigger', 'client_fallback'
  success,
  error_message,
  metadata -- Include token generation info
);
```

### Audit Log Schema Fix
```sql
-- Fix the missing user_agent column issue
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS user_agent text;

-- Or make user_agent optional in audit logging
UPDATE audit_logs SET user_agent = 'system' WHERE user_agent IS NULL;
```

## Error Handling

### 1. CORS Error Prevention
- Use `supabase.functions.invoke()` instead of direct fetch calls
- Let Edge Functions handle all external API calls
- Ensure proper CORS headers in Edge Function responses

### 2. Token Generation Error Handling
- Move token generation server-side to avoid client-side failures
- Implement retry logic within Edge Function
- Provide fallback mechanisms if token generation fails

### 3. Audit Log Error Handling
- Make user_agent column optional or provide default values
- Implement graceful degradation if audit logging fails
- Don't let audit log failures break the main email process

### 4. Comprehensive Error Reporting
- Log all errors with detailed context
- Provide clear error messages to admins
- Implement proper retry mechanisms

## Testing Strategy

### 1. Edge Function Testing
- Test enhanced `send-email` function with `invitation_approved` type
- Verify token generation works within Edge Function
- Test error handling for token generation failures

### 2. Integration Testing
- Test complete approval flow from admin dashboard
- Verify emails appear in Resend dashboard
- Test fallback mechanisms when database triggers fail

### 3. CORS Testing
- Verify no CORS errors occur during approval process
- Test from different origins (localhost, production)
- Ensure proper authentication headers

### 4. Database Testing
- Test enhanced database triggers
- Verify audit logging works without schema errors
- Test RPC function calls to enhanced send-email function

## Security Considerations

### 1. Token Security
- Generate tokens server-side only
- Use cryptographically secure random generation
- Implement proper token expiration and validation

### 2. Authentication Flow
- Use service role authentication in Edge Functions
- Avoid exposing service keys to client-side code
- Implement proper access controls

### 3. Input Validation
- Validate all email addresses and invitation data
- Sanitize input data before processing
- Implement rate limiting for email sending

## Performance Considerations

### 1. Unified Email Processing
- Single Edge Function call instead of multiple API calls
- Reduced client-server round trips
- Faster email delivery

### 2. Error Recovery
- Efficient fallback mechanisms
- Proper timeout handling
- Connection pooling for database operations

### 3. Monitoring
- Real-time monitoring of email success rates
- Performance metrics for email delivery times
- Alerting for approval process failures

## Implementation Phases

### Phase 1: Edge Function Enhancement
- Extend `send-email` function to handle `invitation_approved` type
- Integrate token generation logic
- Test token generation within Edge Function

### Phase 2: Client-Side Fixes
- Update `sendInvitationEmailFallback` to use direct email sending
- Remove calls to `invitation-tokens` function from client-side
- Update error handling and logging

### Phase 3: Database Integration
- Update database triggers to use enhanced `send-email` function
- Fix audit log schema issues
- Test complete database-driven flow

### Phase 4: Testing and Validation
- End-to-end testing of approval process
- Verify emails reach Resend dashboard
- Performance and reliability testing

This design ensures that both form submission and invitation approval use the same reliable, server-side email sending mechanism, eliminating CORS issues and providing consistent behavior across the application.