# Email Service Edge Function

A comprehensive email service built with Supabase Edge Functions and Resend API integration. This service provides secure, server-side email sending capabilities with template support, comprehensive logging, and monitoring.

## Features

- 🚀 **Resend API Integration**: Reliable email delivery with Resend
- 📧 **Template System**: React Email components with fallback HTML templates
- 📊 **Comprehensive Logging**: Structured logging for monitoring and debugging
- 🔄 **Retry Logic**: Automatic retry with exponential backoff for transient failures
- 🛡️ **Error Handling**: Detailed error categorization and handling
- 📈 **Health Monitoring**: Built-in health checks and metrics endpoints
- ✅ **Validation**: Input validation and sanitization

## Environment Variables

```bash
RESEND_API_KEY=your_resend_api_key_here
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

## API Endpoints

### Send Email
```
POST /send-email
```

**Request Body:**
```json
{
  "type": "invitation_confirmation" | "invitation_approved" | "custom",
  "to": "recipient@example.com",
  "templateData": {
    // Template-specific data
  },
  "from": "optional@sender.com"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "resend_message_id"
}
```

### Health Check
```
GET /send-email/health
```

**Response:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "metrics": {
    "sent": 0,
    "failed": 0,
    "bounced": 0,
    "delivered": 0,
    "templateErrors": 0,
    "apiErrors": 0
  },
  "checks": {
    "resendApiKey": true,
    "defaultFromEmail": true
  }
}
```

### Metrics
```
GET /send-email/metrics
```

### Connection Test
```
GET /send-email/test
```

## Email Templates

### Invitation Confirmation
Sent when a user requests an invitation to join the platform.

**Template Data:**
```json
{
  "parentName": "John Doe",
  "childName": "Jane Doe",
  "submissionDate": "2024-01-15"
}
```

### Invitation Approved
Sent when an admin approves an invitation request.

**Template Data:**
```json
{
  "parentName": "John Doe",
  "childName": "Jane Doe",
  "activationUrl": "https://yoursite.com/activate?token=abc123",
  "expirationDate": "2024-01-22"
}
```

### Custom Email
For sending custom emails with your own content.

**Template Data:**
```json
{
  "subject": "Your Subject",
  "html": "<h1>Your HTML content</h1>",
  "text": "Your plain text content"
}
```

## Error Handling

The service provides detailed error responses with appropriate HTTP status codes:

- `400` - Validation errors, invalid request format
- `401` - Authentication errors (invalid API key)
- `403` - Permission errors
- `429` - Rate limiting
- `500` - Server errors
- `503` - Service unavailable

## Logging

All email operations are logged with structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "email-service",
  "event": "email_sent",
  "type": "invitation_confirmation",
  "to": "user@example.com",
  "success": true,
  "messageId": "resend_id",
  "duration": 1250
}
```

## Monitoring

The service includes built-in monitoring capabilities:

- **Health Checks**: Endpoint to verify service health
- **Metrics**: Email delivery statistics and error rates
- **Connection Tests**: Verify Resend API connectivity
- **Error Tracking**: Categorized error logging

## Security Features

- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Protection against abuse
- **Error Sanitization**: Sensitive information is not exposed in error messages
- **CORS Protection**: Proper CORS headers for security

## Development

### Local Testing

1. Set up environment variables
2. Run the test script:
```bash
deno run --allow-net --allow-env supabase/functions/send-email/test-email.ts
```

### Deployment

Deploy using Supabase CLI:
```bash
supabase functions deploy send-email
```

### Setting Environment Variables

```bash
supabase secrets set RESEND_API_KEY=your_api_key
supabase secrets set DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

## Usage Examples

### From Client Code

```typescript
const response = await fetch('/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({
    type: 'invitation_confirmation',
    to: 'user@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      submissionDate: new Date().toLocaleDateString()
    }
  })
})

const result = await response.json()
```

### From Server Code

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, serviceRoleKey)

const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    type: 'invitation_approved',
    to: 'user@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      activationUrl: 'https://yoursite.com/activate?token=abc123',
      expirationDate: '2024-01-22'
    }
  }
})
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Ensure `RESEND_API_KEY` is set correctly
2. **Template Errors**: Check template data format and required fields
3. **Rate Limiting**: Implement proper rate limiting in your application
4. **Network Issues**: Check Resend API status and connectivity

### Debug Mode

Enable debug logging by checking the function logs:
```bash
supabase functions logs send-email
```

## Contributing

When adding new email templates:

1. Create React Email component in `_templates/`
2. Add template type to `EmailRequest` interface
3. Implement template generation in `EmailService`
4. Add validation rules for template data
5. Update documentation and tests