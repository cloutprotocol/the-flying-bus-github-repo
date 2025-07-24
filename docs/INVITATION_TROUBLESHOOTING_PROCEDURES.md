# Invitation System Troubleshooting Procedures

## Overview

This document provides detailed troubleshooting procedures for common issues in The Flying Bus invitation approval workflow system. It's designed for technical support staff and system administrators.

## Quick Reference

### Emergency Contacts
- **Technical Lead**: tech-lead@theflyingbus.com
- **Database Admin**: dba@theflyingbus.com
- **Security Team**: security@theflyingbus.com
- **On-Call Support**: +1-XXX-XXX-XXXX

### System Status Checks
- **Application Health**: `/admin/system-status`
- **Database Status**: Supabase Dashboard
- **Email Service**: SMTP monitoring dashboard
- **Error Logs**: Application logging system

## Common Issues and Solutions

### 1. Email Delivery Failures

#### Issue: Approval/Denial Emails Not Sending

**Symptoms:**
- Parents report not receiving approval/denial emails
- Email notification status shows "failed" in admin dashboard
- High bounce rate in email analytics

**Diagnostic Steps:**
1. Check email service status
   ```bash
   # Check SMTP connection
   curl -v smtp://smtp.provider.com:587
   ```

2. Review email logs
   ```sql
   SELECT * FROM email_notifications 
   WHERE delivery_status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. Verify email configuration
   - Check SMTP credentials in environment variables
   - Verify sender domain authentication (SPF, DKIM)
   - Check rate limiting settings

**Resolution Steps:**
1. **For SMTP Issues:**
   - Restart email service
   - Verify SMTP credentials
   - Check firewall/network connectivity

2. **For Authentication Issues:**
   - Update SPF records: `v=spf1 include:_spf.provider.com ~all`
   - Regenerate DKIM keys if needed
   - Verify domain ownership

3. **For Rate Limiting:**
   - Check current sending rate vs. limits
   - Implement email queue if not present
   - Contact email provider to increase limits

**Prevention:**
- Monitor email delivery rates daily
- Set up alerts for delivery failures > 5%
- Regular testing of email functionality

#### Issue: Emails Going to Spam

**Symptoms:**
- Low open rates on invitation emails
- Parents report emails in spam folder
- High spam complaint rate

**Diagnostic Steps:**
1. Check email authentication status
2. Review email content for spam triggers
3. Monitor sender reputation scores

**Resolution Steps:**
1. **Improve Email Authentication:**
   - Ensure SPF, DKIM, and DMARC are properly configured
   - Use consistent sender domain and IP

2. **Optimize Email Content:**
   - Remove excessive links or promotional language
   - Use plain text versions alongside HTML
   - Include clear unsubscribe options

3. **Sender Reputation:**
   - Monitor blacklist status
   - Gradually increase sending volume
   - Remove bounced email addresses promptly

### 2. Token Generation and Validation Issues

#### Issue: Invalid or Expired Token Errors

**Symptoms:**
- Parents receive "invalid token" errors when clicking invitation links
- Token validation fails in application logs
- High rate of token regeneration requests

**Diagnostic Steps:**
1. Check token in database
   ```sql
   SELECT * FROM invitation_tokens 
   WHERE token = 'TOKEN_VALUE';
   ```

2. Verify token expiration logic
   ```sql
   SELECT token, expires_at, used_at,
          CASE 
            WHEN expires_at < NOW() THEN 'expired'
            WHEN used_at IS NOT NULL THEN 'used'
            ELSE 'valid'
          END as status
   FROM invitation_tokens 
   WHERE invitation_request_id = 'REQUEST_ID';
   ```

3. Check token generation function
   ```sql
   SELECT * FROM invitation_requests 
   WHERE status = 'approved' 
   AND id NOT IN (SELECT invitation_request_id FROM invitation_tokens);
   ```

**Resolution Steps:**
1. **For Expired Tokens:**
   - Regenerate token through admin interface
   - Update expiration date to 30 days from now
   - Resend invitation email

2. **For Missing Tokens:**
   - Check if trigger function is working
   - Manually generate token if needed
   - Investigate trigger failure logs

3. **For Invalid Token Format:**
   - Verify token encoding/decoding logic
   - Check for URL encoding issues
   - Validate token generation algorithm

**Prevention:**
- Monitor token expiration rates
- Set up alerts for high token failure rates
- Regular testing of token generation process

#### Issue: Token Security Concerns

**Symptoms:**
- Multiple failed validation attempts from same IP
- Suspicious token access patterns
- Security alerts from monitoring system

**Diagnostic Steps:**
1. Review security audit logs
   ```sql
   SELECT * FROM security_audit_log 
   WHERE event_type = 'token_validation_failed'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. Check IP access patterns
3. Verify token entropy and randomness

**Resolution Steps:**
1. **For Brute Force Attempts:**
   - Implement rate limiting on token validation
   - Block suspicious IP addresses
   - Notify security team

2. **For Token Compromise:**
   - Invalidate compromised tokens
   - Generate new tokens for affected invitations
   - Review token generation security

### 3. Account Creation and Upgrade Issues

#### Issue: Account Creation Failures

**Symptoms:**
- Parents report errors during account signup
- High rate of incomplete account creations
- Database inconsistencies in user records

**Diagnostic Steps:**
1. Check account creation logs
2. Review database constraints and triggers
3. Verify email verification process

**Resolution Steps:**
1. **For Database Errors:**
   - Check for constraint violations
   - Verify foreign key relationships
   - Review transaction rollback logs

2. **For Email Verification Issues:**
   - Check email verification service status
   - Verify verification email templates
   - Review verification token expiration

3. **For Role Assignment Problems:**
   - Verify role assignment logic
   - Check user permissions after creation
   - Review role-based access control

#### Issue: Existing Account Upgrade Failures

**Symptoms:**
- Users with existing accounts cannot claim invitations
- Role upgrades not applying correctly
- Duplicate account creation attempts

**Diagnostic Steps:**
1. Check for existing accounts with same email
   ```sql
   SELECT * FROM auth.users 
   WHERE email = 'parent@example.com';
   ```

2. Review account upgrade logic
3. Check role assignment in user metadata

**Resolution Steps:**
1. **For Email Conflicts:**
   - Identify existing account
   - Manually upgrade account role
   - Link invitation to existing user

2. **For Role Assignment Issues:**
   - Update user metadata directly
   - Verify role-based permissions
   - Test upgraded account functionality

### 4. Database and Performance Issues

#### Issue: Slow Query Performance

**Symptoms:**
- Admin dashboard loading slowly
- Timeout errors in invitation management
- High database CPU usage

**Diagnostic Steps:**
1. Identify slow queries
   ```sql
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

2. Check database indexes
3. Review query execution plans

**Resolution Steps:**
1. **Add Missing Indexes:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_invitation_requests_status_created 
   ON invitation_requests(status, created_at);
   ```

2. **Optimize Queries:**
   - Rewrite inefficient queries
   - Add appropriate WHERE clauses
   - Use query result caching

3. **Database Maintenance:**
   - Run VACUUM and ANALYZE
   - Update table statistics
   - Consider partitioning large tables

#### Issue: Database Connection Issues

**Symptoms:**
- Connection timeout errors
- "Too many connections" errors
- Intermittent database unavailability

**Diagnostic Steps:**
1. Check connection pool status
2. Monitor active connections
3. Review connection configuration

**Resolution Steps:**
1. **Connection Pool Optimization:**
   - Adjust pool size settings
   - Implement connection retry logic
   - Monitor connection usage patterns

2. **Database Configuration:**
   - Increase max_connections if needed
   - Optimize connection timeout settings
   - Review idle connection cleanup

### 5. System Integration Issues

#### Issue: Supabase Service Disruptions

**Symptoms:**
- Authentication failures
- Database connection errors
- Email service unavailability

**Diagnostic Steps:**
1. Check Supabase status page
2. Review service health endpoints
3. Monitor error rates and response times

**Resolution Steps:**
1. **For Service Outages:**
   - Monitor Supabase status updates
   - Implement graceful degradation
   - Notify users of service issues

2. **For Configuration Issues:**
   - Verify API keys and credentials
   - Check service configuration settings
   - Review rate limiting and quotas

## Monitoring and Alerting

### Key Metrics to Monitor

#### System Health
- Application uptime and response times
- Database connection pool status
- Email service availability
- Error rates by service component

#### Business Metrics
- Invitation approval rates
- Email delivery success rates
- Token claim conversion rates
- Account creation success rates

#### Security Metrics
- Failed authentication attempts
- Suspicious token access patterns
- Rate limiting trigger events
- Security audit log anomalies

### Alert Thresholds

#### Critical Alerts (Immediate Response)
- System downtime > 1 minute
- Database connection failures > 50%
- Email delivery failures > 25%
- Security incidents detected

#### Warning Alerts (Response within 1 hour)
- Response time > 5 seconds
- Email delivery failures > 10%
- Token validation failures > 15%
- High error rates in logs

#### Info Alerts (Daily Review)
- Invitation approval rates outside normal range
- Unusual traffic patterns
- Performance degradation trends
- Capacity utilization warnings

## Escalation Procedures

### Level 1: Support Team
- **Scope**: Common user issues, basic troubleshooting
- **Response Time**: Within 2 hours during business hours
- **Escalation Criteria**: Technical issues requiring code changes

### Level 2: Technical Team
- **Scope**: System issues, performance problems, integration failures
- **Response Time**: Within 1 hour for critical issues
- **Escalation Criteria**: Security incidents, data integrity issues

### Level 3: Senior Technical Lead
- **Scope**: Architecture decisions, major system changes, security incidents
- **Response Time**: Within 30 minutes for critical security issues
- **Escalation Criteria**: System-wide outages, data breaches

### Emergency Escalation
- **Triggers**: Complete system outage, security breach, data loss
- **Response**: Immediate notification to all stakeholders
- **Actions**: Activate incident response team, implement emergency procedures

## Recovery Procedures

### Database Recovery

#### Backup Restoration
1. Identify backup point for restoration
2. Coordinate with Supabase support if needed
3. Verify data integrity after restoration
4. Test system functionality

#### Data Corruption Recovery
1. Identify scope of corruption
2. Isolate affected systems
3. Restore from clean backup
4. Replay transactions if possible

### Service Recovery

#### Application Recovery
1. Restart application services
2. Verify database connectivity
3. Test critical functionality
4. Monitor for recurring issues

#### Email Service Recovery
1. Check SMTP service status
2. Clear email queue if needed
3. Resend failed notifications
4. Verify delivery functionality

## Documentation and Reporting

### Incident Documentation
- **Incident Summary**: Brief description of issue and impact
- **Timeline**: Chronological sequence of events
- **Root Cause**: Technical analysis of underlying cause
- **Resolution**: Steps taken to resolve the issue
- **Prevention**: Measures to prevent recurrence

### Post-Incident Review
- **Impact Assessment**: Quantify user and business impact
- **Response Evaluation**: Review response time and effectiveness
- **Process Improvement**: Identify areas for improvement
- **Action Items**: Specific tasks to prevent recurrence

### Knowledge Base Updates
- Update troubleshooting procedures based on new issues
- Document new solutions and workarounds
- Share lessons learned with team
- Maintain current contact information and escalation paths

---

For questions about these procedures or to report issues not covered here, contact the technical support team at tech-support@theflyingbus.com.