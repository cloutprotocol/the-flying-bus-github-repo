# Invitation Token Management System

This Edge Function provides secure token management for the invitation system, including token generation, validation, and cleanup operations.

## Features

- **Secure Token Generation**: Uses cryptographically secure random generation with SHA-256 hashing
- **Token Validation**: Validates tokens with expiration and usage tracking
- **Automatic Cleanup**: Removes expired tokens from the database
- **Rate Limiting**: Built-in protection against token enumeration attacks
- **Email Verification**: Additional security through email matching

## API Endpoints

### Generate Token
```
POST /functions/v1/invitation-tokens?action=generate
```

**Request Body:**
```json
{
  "invitationId": "uuid",
  "email": "user@example.com",
  "expirationHours": 168
}
```

**Response:**
```json
{
  "success": true,
  "token": "64-character-hex-string"
}
```

### Validate Token (POST)
```
POST /functions/v1/invitation-tokens?action=validate
```

**Request Body:**
```json
{
  "token": "64-character-hex-string",
  "email": "user@example.com"
}
```

### Validate Token (GET)
```
GET /functions/v1/invitation-tokens?action=validate&token=TOKEN&email=EMAIL
```

**Response:**
```json
{
  "success": true,
  "invitationData": {
    "id": "token-uuid",
    "invitation_id": "invitation-uuid",
    "email": "user@example.com",
    "expires_at": "2024-01-01T00:00:00Z",
    "invitation": {
      "id": "invitation-uuid",
      "parent_name": "John Doe",
      "child_name": "Jane Doe",
      "email": "user@example.com",
      "status": "approved",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Cleanup Expired Tokens
```
POST /functions/v1/invitation-tokens?action=cleanup
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 5 expired tokens"
}
```

## Security Features

### Token Generation
- Uses `crypto.getRandomValues()` for secure randomness
- 32 bytes of entropy (256 bits)
- SHA-256 hashing before database storage
- Configurable expiration (default: 7 days)

### Token Validation
- Hash-based lookup (no plaintext tokens in database)
- Expiration checking
- Usage tracking (tokens can only be used once)
- Optional email verification for additional security

### Database Security
- Row Level Security (RLS) policies
- Tokens are hashed, never stored in plaintext
- Automatic cleanup of expired tokens
- Audit trail with creation and usage timestamps

## Database Schema

```sql
CREATE TABLE invitation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invitation_tokens_hash ON invitation_tokens(token_hash);
CREATE INDEX idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX idx_invitation_tokens_expires ON invitation_tokens(expires_at);
```

## RLS Policies

```sql
-- Users can only access tokens for their email or admins can access all
CREATE POLICY "Users can access own invitation tokens" ON invitation_tokens
  FOR SELECT USING (
    email = auth.jwt() ->> 'email' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Only admins can insert tokens
CREATE POLICY "Admins can insert invitation tokens" ON invitation_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Only admins can update tokens (for marking as used)
CREATE POLICY "Admins can update invitation tokens" ON invitation_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- No deletion allowed (for audit trail)
CREATE POLICY "No deletion of invitation tokens" ON invitation_tokens
  FOR DELETE USING (false);
```

## Error Handling

### Common Error Responses

**Invalid Token:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Expired Token:**
```json
{
  "success": false,
  "error": "Token has expired"
}
```

**Missing Fields:**
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

**Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Usage Examples

### Client-Side Token Service

```typescript
import { tokenService } from '@/services/tokenService'

// Generate a token
const result = await tokenService.generateToken({
  invitationId: 'invitation-uuid',
  email: 'user@example.com',
  expirationHours: 168 // 7 days
})

if (result.success) {
  console.log('Token generated:', result.token)
} else {
  console.error('Error:', result.error)
}

// Validate a token
const validation = await tokenService.validateToken({
  token: 'token-string',
  email: 'user@example.com'
})

if (validation.success) {
  console.log('Invitation data:', validation.invitationData)
} else {
  console.error('Validation failed:', validation.error)
}
```

### React Hook Usage

```typescript
import { useTokenManagement } from '@/hooks/useTokenManagement'

function InvitationComponent() {
  const { 
    generateToken, 
    validateToken, 
    isLoading, 
    error 
  } = useTokenManagement()

  const handleGenerateToken = async () => {
    const result = await generateToken({
      invitationId: 'invitation-id',
      email: 'user@example.com'
    })
    
    if (result.success) {
      // Handle success
    }
  }

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleGenerateToken}>
        Generate Token
      </button>
    </div>
  )
}
```

## Monitoring and Maintenance

### Cleanup Schedule
Set up a cron job to regularly clean up expired tokens:

```sql
-- Daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 2 * * *',
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/invitation-tokens?action=cleanup'',
    headers := ''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb
  );'
);
```

### Monitoring Queries

```sql
-- Check token statistics
SELECT 
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) as active_tokens,
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at <= NOW()) as expired_tokens,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) as used_tokens
FROM invitation_tokens;

-- Find tokens expiring soon
SELECT email, expires_at, invitation_id
FROM invitation_tokens
WHERE used_at IS NULL 
  AND expires_at > NOW() 
  AND expires_at < NOW() + INTERVAL '24 hours'
ORDER BY expires_at;
```

## Security Best Practices

1. **Never log plaintext tokens** - Use `TokenSecurityUtils.sanitizeTokenForLogging()`
2. **Validate token format** - Check length and hex characters before API calls
3. **Implement rate limiting** - Use client-side rate limiting for additional protection
4. **Monitor for suspicious activity** - Track failed validation attempts
5. **Regular cleanup** - Schedule automatic cleanup of expired tokens
6. **Audit trail** - Keep logs of token generation and usage
7. **Secure transmission** - Always use HTTPS for token operations
8. **Email verification** - Include email in validation for additional security

## Troubleshooting

### Common Issues

1. **Token validation fails**: Check token format and expiration
2. **Permission denied**: Ensure user has proper role for token operations
3. **Database errors**: Check RLS policies and table permissions
4. **Network errors**: Verify Edge Function deployment and API endpoints

### Debug Mode

Enable debug logging by setting environment variables:
```
FASTMCP_LOG_LEVEL=DEBUG
```

This will provide detailed logs for token operations and help identify issues.