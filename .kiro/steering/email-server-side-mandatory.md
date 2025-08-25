# Email Server-Side Implementation - MANDATORY

## CRITICAL RULE: All Email Sending MUST Be Server-Side

**⚠️ MANDATORY**: All transactional emails through Resend MUST be sent server-side via Supabase Edge Functions. Client-side email sending will be blocked by CORS and will fail.

### Why This Is Critical

1. **CORS Restrictions**: Resend API blocks client-side requests due to CORS policy
2. **Security**: API keys should never be exposed to client-side code
3. **Reliability**: Server-side execution is more reliable and controllable
4. **Monitoring**: Server-side logs are easier to track and debug

### Correct Implementation Pattern

#### ✅ CORRECT: Server-Side via Edge Functions

```typescript
// Client calls Edge Function
const response = await supabase.functions.invoke('send-email', {
  body: {
    type: 'invitation_confirmation',
    to: 'user@example.com',
    templateData: { ... }
  }
});

// Edge Function handles Resend API call
const resendResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailData)
});
```

#### ❌ INCORRECT: Direct Client-Side Calls

```typescript
// This will FAIL due to CORS
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${resendApiKey}`, // Also security risk
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailData)
});
```

### Current Implementation Status

The system currently uses the correct pattern:

1. **Client-side services** call Supabase Edge Functions
2. **Edge Functions** (`send-email`, `send-invitation-approved`) handle Resend API calls
3. **Database triggers** can also invoke Edge Functions for automatic emails

### Edge Functions That Handle Email

- `supabase/functions/send-email/` - Main email service
- `supabase/functions/send-invitation-approved/` - Invitation approval emails

### Client-Side Services

- `src/services/invitationService.ts` - Uses Edge Functions for emails
- `src/services/authenticatedApiService.ts` - Wrapper for Edge Function calls

### Debugging Email Issues

When emails don't appear in Resend dashboard:

1. **Check Edge Function logs**: `supabase functions logs send-email`
2. **Verify environment variables**: RESEND_API_KEY must be set in Edge Function environment
3. **Test Edge Function directly**: Use curl or Postman to test the endpoint
4. **Check CORS headers**: Edge Functions must include proper CORS headers

### Environment Variables

Edge Functions need these environment variables:
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - Default from email address
- `RESEND_FROM_NAME` - Default from name

### Never Do This

- Never put Resend API keys in client-side environment variables
- Never make direct fetch calls to Resend API from client code
- Never expose service role keys to client-side code
- Never bypass Edge Functions for email sending

### If Emails Aren't Reaching Resend

1. Check if Edge Function is being called (client-side logs)
2. Check Edge Function execution (server-side logs)
3. Verify Resend API key is available in Edge Function environment
4. Test Edge Function health endpoint
5. Check for CORS issues in browser network tab

This pattern ensures emails work reliably and securely.