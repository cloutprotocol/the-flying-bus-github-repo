# Supabase Environment Configuration

## CRITICAL: Correct Supabase Environment

**⚠️ IMPORTANT: This project uses a SPECIFIC Supabase environment. Do NOT use local or production environments.**

### Correct Environment Details

- **Project Reference ID**: `sutvexycbiiarpkugzpv`
- **Environment Type**: Remote Preview Branch
- **Branch Name**: `add-email`
- **Purpose**: Development and testing of email notification system

### Environment URLs

- **API URL**: `https://sutvexycbiiarpkugzpv.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/sutvexycbiiarpkugzpv`
- **Functions URL**: `https://sutvexycbiiarpkugzpv.supabase.co/functions/v1/`

### NEVER Use These Environments

❌ **Local Supabase** (`127.0.0.1:54321`)
- Do NOT use `supabase start` or local development
- Do NOT use local database connections
- Do NOT apply migrations locally

❌ **Production/Main Branch** 
- Do NOT use the main production branch
- Do NOT deploy directly to production
- Do NOT modify live user data

❌ **Other Projects**
- Do NOT use `wxmtfsexxhkjwgrejmji` (The Flying Bus main project)
- Do NOT use any other project references

### Correct Commands to Use

#### Database Operations
```bash
# Always specify the correct project reference
supabase db push --project-ref sutvexycbiiarpkugzpv
supabase db diff --project-ref sutvexycbiiarpkugzpv
```

#### Function Deployment
```bash
# Deploy to the correct preview branch
supabase functions deploy send-email --project-ref sutvexycbiiarpkugzpv
supabase functions deploy invitation-tokens --project-ref sutvexycbiiarpkugzpv
```

#### Secrets Management
```bash
# Set secrets on the correct project
supabase secrets set RESEND_API_KEY=xxx --project-ref sutvexycbiiarpkugzpv
supabase secrets list --project-ref sutvexycbiiarpkugzpv
```

#### Logs and Monitoring
```bash
# Check logs from the correct environment
supabase functions logs send-email --project-ref sutvexycbiiarpkugzpv
```

### MCP Supabase Tool Usage

When using MCP Supabase tools, they should automatically connect to the correct environment based on the project configuration. However, always verify:

- `mcp_supabase_list_tables` should show email-related tables
- `mcp_supabase_execute_sql` runs against the preview branch
- `mcp_supabase_apply_migration` applies to the correct database

### Verification Steps

Before performing any Supabase operations, ALWAYS verify:

1. **Check current branch**: `cat supabase/.branches/_current_branch` should show `add-email`
2. **Check project reference**: `cat supabase/.temp/project-ref` should show `sutvexycbiiarpkugzpv`
3. **Verify tables exist**: Use `mcp_supabase_list_tables` to confirm email system tables are present
4. **Test connection**: Use health check endpoints to verify correct environment

### Expected Database Schema

The correct environment should contain these tables:
- `invitation_tokens`
- `email_events`
- `audit_logs`
- `user_roles`
- And other email notification system tables

If these tables are missing, DO NOT create them - investigate why the environment was reset.

### Troubleshooting

If you encounter missing tables or data:

1. **DO NOT** apply migrations without confirmation
2. **DO NOT** switch to local or production environments
3. **VERIFY** you're connected to the correct preview branch
4. **CHECK** if the branch needs to be restored or recreated
5. **CONSULT** with the user before making any database changes

### Emergency Contacts

If there are issues with the Supabase environment:
- Confirm with user before any destructive operations
- Document any environment changes
- Always backup before major changes

## Summary

**ALWAYS USE**: Remote preview branch `add-email` with project-ref `sutvexycbiiarpkugzpv`
**NEVER USE**: Local Supabase, production branches, or other projects

This environment is specifically configured for email notification system development and testing.