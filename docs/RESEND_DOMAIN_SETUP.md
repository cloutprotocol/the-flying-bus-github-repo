# Resend Domain Setup Guide

This guide walks you through setting up and verifying your domain with Resend for the Email Notification System.

## Prerequisites

- A Resend account (sign up at [resend.com](https://resend.com))
- Access to your domain's DNS settings
- A domain you want to send emails from

## Step 1: Add Domain to Resend

1. Log in to your Resend dashboard
2. Navigate to **Domains** in the sidebar
3. Click **Add Domain**
4. Enter your domain name (e.g., `yourdomain.com`)
5. Click **Add Domain**

## Step 2: Configure DNS Records

After adding your domain, Resend will provide you with DNS records to add to your domain. You'll need to add the following records:

### SPF Record
Add this TXT record to your domain:

```
Name: @
Type: TXT
Value: v=spf1 include:_spf.resend.com ~all
```

### DKIM Records
Resend will provide you with DKIM records that look like this:

```
Name: [provided-by-resend]._domainkey
Type: TXT
Value: [long-dkim-key-provided-by-resend]
```

### DMARC Record (Recommended)
Add this TXT record for better email deliverability:

```
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## Step 3: Verify Domain

1. After adding the DNS records, wait for DNS propagation (can take up to 48 hours)
2. In the Resend dashboard, click **Verify** next to your domain
3. If verification fails, double-check your DNS records and wait longer for propagation

## Step 4: Configure Environment Variables

Once your domain is verified, update your production environment variables:

```bash
# In your .env.production file
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Platform Name
```

## Step 5: Test Email Sending

After deployment, test your email configuration:

```bash
# Test the email service health endpoint
curl https://your-project-ref.supabase.co/functions/v1/send-email/health

# Test Resend connection
curl https://your-project-ref.supabase.co/functions/v1/send-email/test
```

## Common Issues and Solutions

### DNS Propagation Delays
- DNS changes can take up to 48 hours to propagate globally
- Use tools like [whatsmydns.net](https://www.whatsmydns.net) to check propagation status
- Some DNS providers update faster than others

### DKIM Verification Fails
- Ensure the DKIM record is added exactly as provided by Resend
- Check for extra spaces or characters in the DNS record
- Some DNS providers require quotes around long TXT record values

### SPF Record Conflicts
- If you already have an SPF record, you need to modify it to include Resend
- Combine existing SPF mechanisms with `include:_spf.resend.com`
- Example: `v=spf1 include:_spf.google.com include:_spf.resend.com ~all`

### Email Delivery Issues
- Check your domain's reputation using tools like [MXToolbox](https://mxtoolbox.com)
- Ensure your domain isn't on any blacklists
- Monitor bounce rates and spam complaints in Resend dashboard

## Best Practices

### Email Authentication
- Always set up SPF, DKIM, and DMARC records
- Use a dedicated subdomain for transactional emails (e.g., `mail.yourdomain.com`)
- Monitor your domain reputation regularly

### Content Guidelines
- Use clear, descriptive subject lines
- Include a physical address in email footers
- Provide easy unsubscribe options
- Avoid spam trigger words and excessive capitalization

### Monitoring and Analytics
- Set up webhooks in Resend to track email events
- Monitor delivery rates, open rates, and bounce rates
- Set up alerts for high bounce or complaint rates

## Webhook Configuration (Optional)

To receive real-time email events, configure webhooks in Resend:

1. In Resend dashboard, go to **Webhooks**
2. Click **Add Webhook**
3. Enter your webhook URL: `https://your-project-ref.supabase.co/functions/v1/resend-webhook`
4. Select events you want to receive (delivered, bounced, complained, etc.)
5. Save the webhook configuration

## Security Considerations

### API Key Management
- Store your Resend API key securely in Supabase secrets
- Use different API keys for development and production
- Rotate API keys regularly
- Never commit API keys to version control

### Rate Limiting
- Resend has rate limits based on your plan
- Implement application-level rate limiting to stay within limits
- Monitor your usage in the Resend dashboard

### Email Content Security
- Sanitize all user-generated content in emails
- Use parameterized templates to prevent injection attacks
- Validate email addresses before sending

## Troubleshooting Commands

### Check DNS Records
```bash
# Check SPF record
dig TXT yourdomain.com | grep spf

# Check DKIM record
dig TXT [selector]._domainkey.yourdomain.com

# Check DMARC record
dig TXT _dmarc.yourdomain.com
```

### Test Email Delivery
```bash
# Send a test email via API
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "noreply@yourdomain.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email from your domain."
  }'
```

## Support Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Discord Community](https://discord.gg/resend)
- [DNS Propagation Checker](https://www.whatsmydns.net)
- [Email Deliverability Guide](https://resend.com/docs/knowledge-base/deliverability)

## Next Steps

After completing domain setup:

1. Run the production deployment script
2. Test the complete invitation flow
3. Set up monitoring and alerting
4. Configure backup email providers if needed
5. Document your email templates and workflows