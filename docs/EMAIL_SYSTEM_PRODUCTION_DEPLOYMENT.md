# Email System Production Deployment Guide

This guide provides comprehensive instructions for deploying the Email Notification System to production.

## Overview

The Email Notification System consists of:
- **Supabase Edge Functions** for email sending and token management
- **Database migrations** for RLS policies and monitoring tables
- **Resend integration** for reliable email delivery
- **Monitoring and alerting** for production operations

## Prerequisites

### Required Accounts and Services
- [Supabase](https://supabase.com) project (production)
- [Resend](https://resend.com) account with verified domain
- Domain with DNS management access
- Node.js 18+ and npm installed
- Supabase CLI installed

### Required Environment Variables
```bash
# Resend Configuration
RESEND_API_KEY=re_your_production_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Platform Name

# Optional Configuration
EMAIL_RATE_LIMIT_PER_HOUR=100
EMAIL_RATE_LIMIT_PER_DAY=1000
TOKEN_EXPIRATION_HOURS=168
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true
LOG_LEVEL=info
ALERT_EMAIL=admin@yourdomain.com
```

## Quick Start

### 1. Validate Configuration
```bash
# Validate all production configuration
npm run validate:production
```

### 2. Deploy to Production
```bash
# Run the automated deployment script
npm run deploy:production
```

### 3. Verify Deployment
```bash
# Run comprehensive health checks
npm run health-check
```

## Detailed Deployment Steps

### Step 1: Domain Setup

1. **Configure Resend Domain**
   - Follow the [Resend Domain Setup Guide](./RESEND_DOMAIN_SETUP.md)
   - Add DNS records (SPF, DKIM, DMARC)
   - Verify domain in Resend dashboard

2. **Test Domain Configuration**
   ```bash
   # Check DNS propagation
   dig TXT yourdomain.com | grep spf
   dig TXT _dmarc.yourdomain.com
   ```

### Step 2: Environment Configuration

1. **Create Production Environment File**
   ```bash
   cp supabase/.env.production supabase/.env.local
   ```

2. **Update Environment Variables**
   ```bash
   # Edit with your actual values
   nano supabase/.env.production
   ```

3. **Validate Configuration**
   ```bash
   npm run validate:production
   ```

### Step 3: Database Setup

1. **Link to Production Project**
   ```bash
   supabase link --project-ref your-production-project-ref
   ```

2. **Deploy Migrations**
   ```bash
   supabase db push
   ```

3. **Verify Migration**
   ```bash
   supabase db diff
   ```

### Step 4: Edge Functions Deployment

1. **Deploy Functions**
   ```bash
   # Deploy send-email function
   supabase functions deploy send-email --no-verify-jwt
   
   # Deploy invitation-tokens function
   supabase functions deploy invitation-tokens --no-verify-jwt
   ```

2. **Set Function Secrets**
   ```bash
   # Set Resend API key
   echo "your_resend_api_key" | supabase secrets set RESEND_API_KEY
   
   # Set email configuration
   echo "noreply@yourdomain.com" | supabase secrets set RESEND_FROM_EMAIL
   echo "Your Platform" | supabase secrets set RESEND_FROM_NAME
   ```

### Step 5: Monitoring Setup

1. **Configure Monitoring**
   ```bash
   npm run setup:monitoring
   ```

2. **Verify Cron Jobs**
   ```sql
   SELECT jobname, schedule, active FROM cron.job;
   ```

### Step 6: Health Verification

1. **Run Health Checks**
   ```bash
   npm run health-check
   ```

2. **Test Individual Services**
   ```bash
   # Test email service
   curl https://your-project.supabase.co/functions/v1/send-email/health
   
   # Test token service
   curl -X POST https://your-project.supabase.co/functions/v1/invitation-tokens?action=cleanup
   ```

## Production Configuration Details

### Database Tables Created

The production migration creates these monitoring tables:

- **audit_logs** - Audit trail for all operations
- **email_metrics** - Email delivery tracking
- **rate_limits** - API rate limiting data
- **email_system_dashboard** - Monitoring view

### Scheduled Jobs

Automatic cleanup jobs are scheduled:

- **Daily** (2 AM UTC): Cleanup expired tokens
- **Weekly** (Sunday 3 AM UTC): Cleanup old rate limits
- **Monthly** (1st, 4 AM UTC): Cleanup old audit logs
- **Monthly** (1st, 5 AM UTC): Cleanup old email metrics
- **Hourly**: Check for system alerts

### Security Features

- **Row Level Security (RLS)** on all tables
- **Token hashing** with SHA-256
- **Rate limiting** on API endpoints
- **Input sanitization** for all user data
- **Audit logging** for all operations

## Monitoring and Alerting

### Health Check Endpoints

```bash
# Email service health
GET /functions/v1/send-email/health

# Email service metrics
GET /functions/v1/send-email/metrics

# Resend connection test
GET /functions/v1/send-email/test
```

### Key Metrics to Monitor

- **Email delivery rate** (should be >95%)
- **Token usage rate** (active vs expired)
- **Error rates** (should be <5%)
- **Response times** (should be <5s)

### Alert Conditions

Alerts are triggered for:
- Email error rate >10% (with >10 emails sent)
- >5 unused tokens older than 24 hours
- Database connection failures
- High response times

## Troubleshooting

### Common Issues

1. **Email Delivery Failures**
   ```bash
   # Check Resend connection
   curl https://your-project.supabase.co/functions/v1/send-email/test
   
   # Check recent errors
   psql -c "SELECT * FROM audit_logs WHERE success = false ORDER BY created_at DESC LIMIT 10;"
   ```

2. **Token Validation Issues**
   ```bash
   # Check token statistics
   psql -c "SELECT COUNT(*) as active_tokens FROM invitation_tokens WHERE expires_at > NOW() AND used_at IS NULL;"
   ```

3. **Database Connection Issues**
   ```bash
   # Check database health
   supabase db inspect
   ```

### Log Analysis

```bash
# Check Edge Function logs
supabase functions logs send-email --follow

# Check database logs
supabase logs db --follow
```

## Performance Optimization

### Database Optimization

- Indexes are created on frequently queried columns
- Old data is automatically cleaned up
- Connection pooling is handled by Supabase

### Email Optimization

- Rate limiting prevents API abuse
- Retry logic handles temporary failures
- Templates are cached for performance

## Security Considerations

### API Security

- All endpoints require proper authentication
- Rate limiting prevents abuse
- Input validation prevents injection attacks

### Data Security

- Tokens are hashed before storage
- PII is handled according to privacy policies
- Audit logs track all sensitive operations

### Network Security

- HTTPS enforced for all communications
- CORS properly configured
- API keys stored securely

## Backup and Recovery

### Database Backups

Supabase automatically handles:
- Daily database backups
- Point-in-time recovery
- Cross-region replication

### Configuration Backups

Keep backups of:
- Environment variables
- DNS configurations
- Resend domain settings

## Scaling Considerations

### Email Volume

- Monitor Resend usage limits
- Consider multiple email providers for redundancy
- Implement queue system for high volume

### Database Performance

- Monitor query performance
- Add indexes as needed
- Consider read replicas for analytics

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs and metrics
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Disaster recovery testing

### Updates

```bash
# Update Supabase CLI
npm install -g @supabase/cli@latest

# Update dependencies
npm update
```

## Support and Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)

### Monitoring Tools
- Supabase Dashboard
- Resend Dashboard
- Custom monitoring dashboard (if implemented)

### Emergency Contacts
- Technical Lead: [Your contact info]
- Database Administrator: [Your contact info]
- On-call Engineer: [Your contact info]

## Next Steps

After successful deployment:

1. **Test the complete invitation flow**
2. **Set up monitoring dashboards**
3. **Configure backup procedures**
4. **Train support team**
5. **Document operational procedures**

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Maintained By**: [Your Team]