# Invitation URL Configuration

This document explains how to configure the base URL used in invitation emails for different environments.

## Overview

When users receive invitation approval emails, they contain activation links that direct them to your application. The base URL for these links is configurable and should be different for development and production environments.

## Current Configuration

- **Development**: `http://localhost:8080`
- **Production**: `https://theflyingbus.org`

## How It Works

The invitation URLs are generated in the `send-email` Edge Function using the `SITE_BASE_URL` environment variable:

```typescript
const baseUrl = Deno.env.get('SITE_BASE_URL') || 'https://theflyingbus.org'
const activationUrl = `${baseUrl}/invitation/activate?token=${token}`
```

## Switching Between Environments

### For Development (localhost:8080)

Run the development script:
```bash
./scripts/set-dev-url.sh
```

Or manually set the environment variable:
```bash
supabase secrets set SITE_BASE_URL=http://localhost:8080 --project-ref sutvexycbiiarpkugzpv
```

### For Production (theflyingbus.org)

Run the production script:
```bash
./scripts/set-prod-url.sh
```

Or manually set the environment variable:
```bash
supabase secrets set SITE_BASE_URL=https://theflyingbus.org --project-ref sutvexycbiiarpkugzpv
```

## Verification

To verify the current URL setting:
```bash
supabase secrets list --project-ref sutvexycbiiarpkugzpv
```

Look for the `SITE_BASE_URL` entry in the output.

## Environment Files

The configuration is also documented in environment files:

- **Development**: `supabase/.env.local`
- **Production**: `supabase/.env.production`

These files are used by the deployment scripts and serve as documentation of the expected configuration.

## Deployment

When deploying to production, the `scripts/deploy-production.sh` script will automatically set the production URL from the `SITE_BASE_URL` variable in the production environment file.

## Testing

After changing the URL configuration:

1. Create a test invitation request
2. Approve it as an admin
3. Check the email received - the activation link should use the correct domain
4. Click the link to verify it directs to the right environment

## Troubleshooting

If invitation links are still using the wrong domain:

1. Verify the environment variable is set correctly:
   ```bash
   supabase secrets list --project-ref sutvexycbiiarpkugzpv
   ```

2. Redeploy the Edge Functions if needed:
   ```bash
   supabase functions deploy send-email --project-ref sutvexycbiiarpkugzpv
   ```

3. Test with a new invitation (existing emails won't change)

## Security Note

The URL configuration affects where users are directed when they click invitation links. Always ensure:

- Development URLs point to your local development server
- Production URLs point to your secure, verified domain
- Never use HTTP in production (always HTTPS)