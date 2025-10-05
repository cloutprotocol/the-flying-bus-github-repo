# Invitation Service Email Extensions

This document describes the email functionality added to the invitation service as part of task 5.

## Overview

The invitation service has been extended with comprehensive email functionality to support the complete invitation flow:

1. **Confirmation emails** when users request invitations
2. **Invitation emails** with secure tokens when admins approve requests
3. **Token validation** for secure invitation links
4. **Invitation completion** workflow for both new and existing users

## New Functions

### `sendInvitationConfirmation(invitationId: string)`

Sends a confirmation email to users after they submit an invitation request.

- **Purpose**: Confirms receipt of invitation request
- **Triggers**: Automatically called when `createInvitationRequest` is executed
- **Email Type**: `invitation_confirmation`
- **Updates**: Sets `confirmation_email_sent_at` timestamp

### `sendInvitationEmailFallback(invitationId: string, invitationData: any)`

Sends an invitation email with a secure token when an admin approves a request (client-side fallback).

- **Purpose**: Provides secure activation link to approved users via client-side fallback
- **Triggers**: Called by `updateInvitationRequestStatus` when database triggers fail
- **Email Type**: `invitation_approved`
- **Token**: Token generation handled server-side by the Edge Function
- **Updates**: Sets `invitation_email_sent_at` timestamp via database triggers

### `validateInvitationToken(token: string, email?: string)`

Validates an invitation token and retrieves associated invitation data.

- **Purpose**: Verifies token validity and retrieves invitation details
- **Security**: Includes optional email validation for additional security
- **Returns**: `InvitationTokenData` with invitation details
- **Edge Function**: Calls `/invitation-tokens?action=validate`

### `completeInvitation(token: string, userData?: UserData)`

Completes the invitation process for both existing and new users.

- **Purpose**: Activates author role or creates new user account
- **Existing Users**: Upgrades role to 'author'
- **New Users**: Creates account with 'author' role
- **Security**: Marks token as used after successful completion
- **Updates**: Sets `completed_at` timestamp and `child_user_id`

## Integration Points

### Email Service Integration

All email functions integrate with the Supabase Edge Function at `/functions/v1/send-email`:

```typescript
const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    type: 'invitation_confirmation' | 'invitation_approved',
    to: email,
    templateData: { /* template-specific data */ }
  })
});
```

### Token Service Integration

Token operations integrate with the Supabase Edge Functions via the AuthenticatedApiService:

```typescript
// Token generation is handled server-side by the send-email Edge Function
// Client-side code sends email with invitationId, Edge Function generates token internally

// Validate token (client-side)
const validationResult = await AuthenticatedApiService.validateInvitationToken({
  token,
  email
});

// Mark token as used (client-side)
const markUsedResult = await AuthenticatedApiService.markTokenAsUsed(token);
```

**Note**: Token generation is no longer performed client-side to avoid CORS issues. The `send-email` Edge Function handles token generation internally when processing `invitation_approved` emails.

## Database Schema Updates

The service works with the enhanced database schema:

### invitation_requests table
- `confirmation_email_sent_at`: Timestamp when confirmation email was sent
- `invitation_email_sent_at`: Timestamp when invitation email was sent  
- `completed_at`: Timestamp when invitation was completed
- `child_user_id`: ID of the user who completed the invitation

### invitation_tokens table
- `id`: Primary key
- `invitation_id`: Foreign key to invitation_requests
- `token_hash`: SHA-256 hash of the token
- `email`: Email address for additional security
- `expires_at`: Token expiration timestamp
- `used_at`: Timestamp when token was used
- `created_at`: Token creation timestamp

## Error Handling

All functions include comprehensive error handling:

- **Network Errors**: Graceful handling of API failures
- **Validation Errors**: Proper error messages for invalid data
- **Token Errors**: Specific handling for expired/invalid/used tokens
- **Database Errors**: Transaction rollback and error logging

## Security Features

- **Token Hashing**: Tokens are hashed with SHA-256 before database storage
- **Email Validation**: Optional email matching for token validation
- **Expiration**: 7-day token expiration with automatic cleanup
- **Single Use**: Tokens are marked as used after successful completion
- **Rate Limiting**: Implemented at the Edge Function level

## Usage Examples

### Basic Invitation Flow

```typescript
// 1. User submits invitation request (automatically sends confirmation)
const request = await createInvitationRequest({
  parent_name: "John Doe",
  parent_email: "john@example.com",
  child_name: "Jane Doe",
  child_age: 12
});

// 2. Admin approves request (automatically sends invitation email)
const approval = await updateInvitationRequestStatus(
  request.data.id, 
  'approved', 
  adminId
);

// 3. User clicks invitation link and validates token
const validation = await validateInvitationToken(token, email);

// 4. Complete invitation (existing user)
const completion = await completeInvitation(token);

// 5. Complete invitation (new user)
const newUserCompletion = await completeInvitation(token, {
  email: "john@example.com",
  password: "securePassword123",
  display_name: "John Doe"
});
```

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **1.2**: Confirmation email sent when invitation request is submitted
- **2.2**: Invitation email sent with secure token when admin approves
- **3.1**: Token validation and invitation data retrieval for existing users
- **4.1**: Complete invitation workflow for both new and existing users

## Testing

The implementation includes comprehensive test coverage:

- Unit tests for all new functions
- Integration tests for email and token services
- Error handling tests for various failure scenarios
- Security tests for token validation and usage

## Dependencies

- Supabase Edge Functions for email and token services
- Resend API for email delivery (configured in Edge Functions)
- Web Crypto API for secure token hashing
- Existing invitation service functions and database schema