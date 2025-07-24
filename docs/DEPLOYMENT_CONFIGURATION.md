# Deployment Configuration Guide

## Overview

This guide provides comprehensive instructions for deploying the invitation approval workflow system to production environments.

## Environment Variables

### Required Environment Variables

#### Supabase Configuration
```bash
# Supabase Project Settings
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Connection
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

#### Email Service Configuration
```bash
# SMTP Settings for Email Notifications
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@theflyingbus.com
SMTP_FROM_NAME="The Flying Bus"

# Email Rate Limiting
EMAIL_RATE_LIMIT_PER_HOUR=100
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=5000
```

#### Application Settings
```bash
# Application URLs
VITE_APP_URL=https://theflyingbus.com
INVITATION_BASE_URL=https://theflyingbus.com/claim-invitation

# Security Settings
JWT_SECRET=your-jwt-secret-key
INVITATION_TOKEN_EXPIRY_DAYS=30
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring and Logging
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
MONITORING_WEBHOOK_URL=your-monitoring-webhook
```

#### Third-party Integrations
```bash
# Thirdweb Configuration
VITE_THIRDWEB_CLIENT_ID=your-thirdweb-client-id

# Analytics (if applicable)
GOOGLE_ANALYTICS_ID=your-ga-id
```

### Environment-Specific Variables

#### Development
```bash
NODE_ENV=development
VITE_DEBUG_MODE=true
LOG_LEVEL=debug
```

#### Staging
```bash
NODE_ENV=staging
VITE_DEBUG_MODE=false
LOG_LEVEL=info
```

#### Production
```bash
NODE_ENV=production
VITE_DEBUG_MODE=false
LOG_LEVEL=warn
```

## Database Migration Procedures

### Pre-Deployment Database Setup

#### 1. Execute Core Schema Migration
Run the following SQL in your Supabase SQL Editor:

```sql
-- Create invitation_tokens table
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_request_id UUID NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_notifications table
DO $$ BEGIN
  CREATE TYPE email_type AS ENUM ('approval', 'denial', 'welcome', 'expiry_warning');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed', 'bounced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_request_id UUID NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  email_type email_type NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status delivery_status DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to invitation_requests table (if not exists)
DO $$ BEGIN
  ALTER TABLE invitation_requests 
  ADD COLUMN IF NOT EXISTS invitation_claimed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT 'pending';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
```

#### 2. Create Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitation_tokens_invitation_id ON invitation_tokens(invitation_request_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitation_tokens_expires_at ON invitation_tokens(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_invitation_id ON email_notifications(invitation_request_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_notifications_status ON email_notifications(delivery_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitation_requests_status ON invitation_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitation_requests_created_at ON invitation_requests(created_at);
```

#### 3. Create Database Functions and Triggers
```sql
-- Function to automatically generate tokens on approval
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate token when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO invitation_tokens (invitation_request_id, token, expires_at)
    VALUES (
      NEW.id,
      encode(gen_random_bytes(32), 'base64url'),
      NOW() + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate tokens
DROP TRIGGER IF EXISTS trigger_generate_invitation_token ON invitation_requests;
CREATE TRIGGER trigger_generate_invitation_token
  AFTER UPDATE ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_invitation_token();
```

#### 4. Set Up Row Level Security (RLS)
```sql
-- Enable RLS on new tables
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can manage invitation tokens" ON invitation_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin can view email notifications" ON email_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

### Migration Verification Script

Create a verification script to ensure all migrations were applied correctly:

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invitation_tokens', 'email_notifications');

-- Verify columns were added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'invitation_requests' 
AND column_name IN ('invitation_claimed_at', 'notification_sent_at', 'notification_status');

-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('invitation_tokens', 'email_notifications', 'invitation_requests')
AND indexname LIKE 'idx_%';

-- Verify triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'invitation_requests';
```

## Email Service Configuration

### SMTP Provider Setup

#### Recommended Providers
1. **SendGrid** (Recommended for high volume)
2. **Mailgun** (Good balance of features and cost)
3. **Amazon SES** (Cost-effective for AWS users)
4. **Postmark** (Excellent deliverability)

#### SendGrid Configuration Example
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### DNS Configuration for Email Authentication

##### SPF Record
```
v=spf1 include:sendgrid.net ~all
```

##### DKIM Setup
1. Generate DKIM keys in your email provider dashboard
2. Add CNAME records as provided by your email service

##### DMARC Policy
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@theflyingbus.com
```

### Email Template Configuration

#### Supabase Email Templates
1. Navigate to Authentication > Email Templates in Supabase Dashboard
2. Configure the following templates:

##### Invitation Approval Template
```html
<h2>Great News! {{.ChildName}} has been approved for The Flying Bus</h2>
<p>We're excited to welcome {{.ChildName}} to our community of young journalists!</p>
<p><a href="{{.InvitationLink}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Claim Your Invitation</a></p>
<p>This invitation expires on {{.ExpirationDate}}.</p>
```

## Monitoring and Alerting Setup

### Application Performance Monitoring

#### Sentry Configuration
```javascript
// In main.tsx or App.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

#### Custom Metrics Dashboard
Set up monitoring for:
- Email delivery rates
- Token generation success rates
- Account creation conversion rates
- System response times
- Error rates by component

### Health Check Endpoints

Create health check endpoints for monitoring:

```typescript
// /api/health
export const healthCheck = {
  database: async () => {
    // Test database connection
    const result = await supabase.from('invitation_requests').select('count').limit(1);
    return result.error ? 'unhealthy' : 'healthy';
  },
  
  email: async () => {
    // Test SMTP connection
    try {
      await testSMTPConnection();
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  },
  
  overall: async () => {
    const checks = await Promise.all([
      healthCheck.database(),
      healthCheck.email()
    ]);
    return checks.every(check => check === 'healthy') ? 'healthy' : 'unhealthy';
  }
};
```

### Alert Configuration

#### Critical Alerts (Immediate Response)
- System downtime
- Database connection failures > 50%
- Email delivery failures > 25%
- Security incidents

#### Warning Alerts (1 Hour Response)
- Response time > 5 seconds
- Email delivery failures > 10%
- Token validation failures > 15%
- High error rates

#### Monitoring Tools Setup
1. **Uptime Monitoring**: Pingdom, UptimeRobot, or similar
2. **Error Tracking**: Sentry or Bugsnag
3. **Performance Monitoring**: New Relic or DataDog
4. **Log Aggregation**: LogRocket or Papertrail

## Security Configuration

### SSL/TLS Setup
- Ensure HTTPS is enforced for all endpoints
- Configure proper SSL certificates
- Set up HSTS headers

### Rate Limiting
```typescript
// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
};
```

### CORS Configuration
```typescript
const corsOptions = {
  origin: [
    'https://theflyingbus.com',
    'https://www.theflyingbus.com',
    // Add staging URLs as needed
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## Deployment Scripts

### Build and Deploy Script
```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment process..."

# Build the application
echo "Building application..."
npm run build

# Run tests
echo "Running tests..."
npm test -- --run

# Deploy to hosting platform (example for Vercel)
echo "Deploying to production..."
vercel --prod

# Run post-deployment verification
echo "Running post-deployment checks..."
curl -f https://theflyingbus.com/api/health || exit 1

echo "Deployment completed successfully!"
```

### Database Migration Script
```bash
#!/bin/bash
# migrate-db.sh

set -e

echo "Running database migrations..."

# Apply migrations
psql $DATABASE_URL -f migrations/invitation_approval_workflow.sql

# Verify migrations
psql $DATABASE_URL -f migrations/verify_migrations.sql

echo "Database migrations completed successfully!"
```

## Rollback Procedures

### Application Rollback
1. Identify the last known good deployment
2. Revert to previous version using deployment platform tools
3. Verify system functionality
4. Monitor for issues

### Database Rollback
1. **Backup Current State**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Restore Previous State**
   ```bash
   psql $DATABASE_URL < backup_previous_version.sql
   ```

3. **Verify Data Integrity**
   - Run verification queries
   - Test critical functionality
   - Monitor system health

## Post-Deployment Verification

### Functional Testing Checklist
- [ ] Admin can approve/deny invitation requests
- [ ] Email notifications are sent successfully
- [ ] Invitation tokens are generated correctly
- [ ] Parents can claim invitations
- [ ] Account creation/upgrade works properly
- [ ] All email templates render correctly
- [ ] Monitoring and alerts are functioning

### Performance Testing
- [ ] Response times are within acceptable limits
- [ ] Database queries are performing efficiently
- [ ] Email delivery is working at expected volume
- [ ] System handles expected concurrent users

### Security Testing
- [ ] All endpoints require proper authentication
- [ ] Rate limiting is working correctly
- [ ] Token validation is secure
- [ ] Email security measures are in place

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- Monitor system health dashboards
- Review error logs for issues
- Check email delivery rates
- Verify backup completion

#### Weekly
- Review performance metrics
- Clean up expired tokens
- Update security patches
- Review user feedback

#### Monthly
- Analyze invitation conversion rates
- Review and update documentation
- Conduct security audits
- Plan capacity upgrades if needed

### Emergency Procedures
1. **System Outage Response**
   - Activate incident response team
   - Implement emergency communication plan
   - Execute recovery procedures
   - Document incident for post-mortem

2. **Security Incident Response**
   - Isolate affected systems
   - Preserve evidence
   - Notify stakeholders
   - Implement remediation measures

---

For questions about deployment procedures, contact the DevOps team at devops@theflyingbus.com.