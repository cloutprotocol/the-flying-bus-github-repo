# Admin Guide: Invitation Management System

## Overview

This guide provides comprehensive instructions for administrators managing the parent invitation approval workflow on The Flying Bus platform.

## System Architecture

The invitation management system consists of several integrated components:
- **Invitation Request Processing**: Review and approval workflow
- **Email Notification System**: Automated communications with parents
- **Token Management**: Secure invitation link generation and validation
- **Account Creation Flow**: Automated account setup for approved invitations
- **Monitoring and Analytics**: Performance tracking and reporting

## Admin Dashboard Access

### Navigation
1. Log in to the admin portal at `/admin`
2. Navigate to "Invitation Management" from the main dashboard
3. Use the sidebar to access different invitation management features

### Dashboard Overview
The invitation management dashboard provides:
- **Pending Requests**: New invitations awaiting review
- **Approved Invitations**: Approved invitations and their claim status
- **Recent Activity**: Timeline of recent invitation events
- **System Metrics**: Performance and conversion statistics

## Managing Invitation Requests

### Reviewing New Requests

#### Request Information Display
Each invitation request shows:
- **Child Information**: Name, age, writing interests
- **Parent Information**: Name, email, relationship to child
- **Request Details**: Submission date, additional comments
- **Safety Checks**: Automated screening results

#### Approval Process
1. **Review Request Details**
   - Verify all required information is complete
   - Check for any safety concerns or red flags
   - Review child's age appropriateness (typically 8-16 years)

2. **Make Decision**
   - Click "Approve" to accept the invitation request
   - Click "Deny" to reject the invitation request
   - Add optional comments for internal tracking

3. **Automated Actions on Approval**
   - System generates secure invitation token
   - Approval email sent to parent automatically
   - Request status updated to "approved"
   - Email notification logged in system

4. **Automated Actions on Denial**
   - Denial email sent to parent automatically
   - Request status updated to "denied"
   - Email notification logged in system

### Bulk Operations
For processing multiple requests:
1. Select multiple requests using checkboxes
2. Choose bulk action from dropdown menu
3. Confirm action in dialog box
4. Monitor progress in notification center

## Email Notification Management

### Email Types and Templates

#### Approval Email
- **Trigger**: When invitation request is approved
- **Content**: Invitation link, platform overview, next steps
- **Expiration**: Invitation token expires in 30 days

#### Denial Email
- **Trigger**: When invitation request is denied
- **Content**: Polite explanation, reapplication information

#### Welcome Email
- **Trigger**: When invitation is successfully claimed
- **Content**: Onboarding information, safety guidelines, getting started guide

#### Expiry Warning Email
- **Trigger**: 7 days before invitation token expires
- **Content**: Reminder to claim invitation, support contact information

### Monitoring Email Delivery

#### Email Status Indicators
- **Green Checkmark**: Email sent successfully
- **Yellow Warning**: Email pending or delayed
- **Red X**: Email delivery failed
- **Blue Info**: Email bounced or rejected

#### Troubleshooting Email Issues
1. **Failed Deliveries**
   - Check email address validity
   - Verify SMTP configuration
   - Review bounce/complaint logs
   - Manually resend if needed

2. **Bounce Handling**
   - Soft bounces: Automatic retry after delay
   - Hard bounces: Mark email as invalid, contact parent via alternative method

## Token Management

### Token Security Features
- **Cryptographically Secure**: Generated using secure random bytes
- **Unique**: Each token is unique and cannot be predicted
- **Time-Limited**: Expires after 30 days
- **Single-Use**: Cannot be reused after successful claim

### Token Operations

#### Viewing Token Status
1. Navigate to approved invitation details
2. View token information panel showing:
   - Token generation date
   - Expiration date
   - Usage status (unused/used)
   - Associated user account (if claimed)

#### Regenerating Tokens
When tokens expire or need to be reset:
1. Open invitation details page
2. Click "Regenerate Token" button
3. Confirm action in dialog
4. New token generated with fresh 30-day expiration
5. New invitation email sent automatically

#### Token Security Monitoring
- Monitor for suspicious token validation attempts
- Review security audit logs regularly
- Alert on multiple failed validation attempts
- Track token usage patterns for anomalies

## Account Creation Monitoring

### Invitation Claim Process
When parents claim invitations:
1. **Token Validation**: System verifies token authenticity and expiration
2. **Email Verification**: Confirms email matches original request
3. **Account Processing**: Creates new account or upgrades existing account
4. **Role Assignment**: Automatically assigns author privileges
5. **Welcome Flow**: Sends welcome email and onboarding materials

### Monitoring Claimed Invitations

#### Claim Status Indicators
- **Unclaimed**: Invitation sent but not yet claimed
- **Claimed**: Successfully claimed and account created/upgraded
- **Expired**: Token expired before being claimed
- **Failed**: Technical error during claim process

#### New Author Notifications
When invitations are successfully claimed:
- Admin notification sent via email
- Dashboard counter updated
- New author appears in user management system
- Welcome email sent to parent/child

## Analytics and Reporting

### Key Metrics Dashboard

#### Conversion Metrics
- **Approval Rate**: Percentage of requests approved vs. denied
- **Claim Rate**: Percentage of approved invitations claimed
- **Time to Claim**: Average time between approval and claim
- **Expiration Rate**: Percentage of invitations that expire unclaimed

#### Email Performance
- **Delivery Rate**: Percentage of emails successfully delivered
- **Open Rate**: Percentage of emails opened by recipients
- **Click Rate**: Percentage of invitation links clicked
- **Bounce Rate**: Percentage of emails that bounced

#### System Performance
- **Processing Time**: Average time to process invitation requests
- **Error Rate**: Percentage of technical errors in the system
- **Support Tickets**: Number of support requests related to invitations

### Generating Reports
1. Navigate to "Reports" section in invitation management
2. Select date range and metrics to include
3. Choose export format (PDF, CSV, Excel)
4. Download or email report to stakeholders

## Troubleshooting Common Issues

### Parent Cannot Claim Invitation

#### Symptoms
- Parent reports invitation link doesn't work
- Error messages during account creation
- Email delivery failures

#### Diagnostic Steps
1. **Verify Token Status**
   - Check if token has expired
   - Confirm token hasn't been used already
   - Validate token format and integrity

2. **Check Email Delivery**
   - Review email notification logs
   - Verify email address accuracy
   - Check spam/junk folder instructions

3. **Account Conflicts**
   - Check if account already exists with that email
   - Verify email address matches invitation request
   - Review account status and permissions

#### Resolution Actions
- Regenerate expired or invalid tokens
- Resend invitation emails
- Manually upgrade existing accounts
- Provide direct support contact

### System Performance Issues

#### Email Delivery Delays
- **Cause**: High email volume or SMTP issues
- **Solution**: Monitor email queue, check SMTP configuration
- **Prevention**: Implement email rate limiting and queue management

#### Database Performance
- **Cause**: High query load during peak times
- **Solution**: Optimize database queries, add indexes
- **Prevention**: Regular performance monitoring and capacity planning

#### Token Generation Failures
- **Cause**: Cryptographic service issues
- **Solution**: Restart token service, check system entropy
- **Prevention**: Monitor token generation success rates

## Security Best Practices

### Access Control
- **Admin Permissions**: Only authorized staff can approve invitations
- **Audit Logging**: All admin actions are logged and tracked
- **Session Management**: Automatic logout after inactivity
- **Two-Factor Authentication**: Required for admin accounts

### Data Protection
- **Email Encryption**: All emails sent over encrypted connections
- **Token Security**: Tokens stored encrypted in database
- **PII Handling**: Personal information handled according to privacy policy
- **Data Retention**: Automatic cleanup of expired tokens and old logs

### Monitoring and Alerts
- **Security Events**: Automated alerts for suspicious activity
- **System Health**: Monitoring for service availability and performance
- **Error Tracking**: Automatic notification of system errors
- **Compliance Auditing**: Regular security and compliance reviews

## Emergency Procedures

### System Outage
1. **Immediate Actions**
   - Check system status dashboard
   - Notify technical team
   - Post status update for users

2. **Communication**
   - Email notification to affected parents
   - Admin team notification
   - Status page update

3. **Recovery**
   - Follow technical recovery procedures
   - Verify system functionality
   - Process any queued operations

### Security Incident
1. **Containment**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation**
   - Analyze security logs
   - Identify scope of incident
   - Document findings

3. **Recovery**
   - Apply security patches
   - Reset compromised credentials
   - Monitor for continued threats

## Support and Escalation

### Internal Support
- **Technical Issues**: Contact development team via Slack #tech-support
- **Policy Questions**: Contact product team via email
- **Security Concerns**: Contact security team immediately

### External Support
- **Parent Inquiries**: Direct to support@theflyingbus.com
- **Technical Problems**: Escalate to technical support team
- **Safety Concerns**: Follow child safety escalation procedures

### Documentation Updates
- Report documentation gaps or errors
- Suggest improvements based on user feedback
- Update procedures after system changes

---

For additional support or questions about this guide, contact the admin support team at admin-support@theflyingbus.com.