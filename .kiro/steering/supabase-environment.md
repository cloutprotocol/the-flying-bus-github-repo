# Supabase Environment Configuration

## CRITICAL: Dual Environment Setup

**⚠️ IMPORTANT: This project uses a dual environment setup with specific usage patterns.**

### Production Environment (Remote)

- **Project Reference ID**: `xwxuwchndgxnnmfprzds`
- **Environment Type**: Production Database
- **Purpose**: Production data, MCP tool access, read-only operations
- **Usage**: MCP Supabase tools connect here for inspection and monitoring

### Local Development Environment

- **Environment Type**: Local Supabase (`supabase start`)
- **Purpose**: Development, testing, migration development
- **Usage**: All development work, migration testing, feature development

### Environment URLs

- **API URL**: `https://xwxuwchndgxnnmfprzds.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/xwxuwchndgxnnmfprzds`
- **Functions URL**: `https://xwxuwchndgxnnmfprzds.supabase.co/functions/v1/`

### Environment Usage Rules

✅ **Production Database (`xwxuwchndgxnnmfprzds`)**
- Use for: MCP tool operations, data inspection, monitoring
- Connected via: MCP Supabase tools
- READ-ONLY operations preferred
- NO direct schema changes

✅ **Local Development**
- Use for: Feature development, migration testing, experimentation
- Started with: `supabase start`
- Apply migrations with: `supabase db reset` or `supabase db push`
- Full development freedom

### 🚨 CRITICAL: Default Database Reference

**When user says "database" without qualification, they mean LOCAL database**
- "database" = Local Supabase database
- "remote database" or "prod database" = Production database (`xwxuwchndgxnnmfprzds`)
- Always assume LOCAL unless explicitly stated otherwise
- Use CLI commands for local database operations
- Use MCP tools only when explicitly asked about production/remote

❌ **NEVER Use These**
- Do NOT use `wxmtfsexxhkjwgrejmji` (old project reference)
- Do NOT apply untested migrations to production
- Do NOT use other project references

### Correct Commands by Environment

#### Local Development
```bash
# Start local Supabase
supabase start

# Apply migrations locally
supabase db reset
supabase db push

# Local function deployment
supabase functions deploy send-email

# Local secrets
supabase secrets set RESEND_API_KEY=xxx

# Local logs
supabase functions logs send-email
```

#### Production Operations (when needed)
```bash
# Production function deployment
supabase functions deploy send-email --project-ref xwxuwchndgxnnmfprzds

# Production secrets management
supabase secrets set RESEND_API_KEY=xxx --project-ref xwxuwchndgxnnmfprzds
supabase secrets list --project-ref xwxuwchndgxnnmfprzds

# Production logs
supabase functions logs send-email --project-ref xwxuwchndgxnnmfprzds
```

### MCP Supabase Tool Usage

MCP Supabase tools connect to the PRODUCTION database (`xwxuwchndgxnnmfprzds`) for:

- `mcp_supabase_list_tables` - Inspect production schema
- `mcp_supabase_execute_sql` - Read-only queries on production
- `mcp_supabase_list_migrations` - Check production migration status
- `mcp_supabase_get_logs` - Monitor production logs
- `mcp_supabase_apply_migration` - Apply migrations to production (use carefully)

**Note**: MCP tools cannot connect to local Supabase - use CLI commands for local development.

### Verification Steps

**For Local Development:**
1. **Check local status**: `supabase status` should show running services
2. **Verify local connection**: `supabase db diff` should work without project-ref
3. **Test local functions**: Local function endpoints should be accessible

**For Production Operations:**
1. **Verify MCP connection**: `mcp_supabase_list_tables` should show production tables
2. **Check project reference**: Production operations should use `xwxuwchndgxnnmfprzds`
3. **Test production endpoints**: Production URLs should be accessible

### Expected Database Schema

The correct environment should contain these tables:
- `invitation_tokens`
- `email_events`
- `audit_logs`
- `user_roles`
- And other email notification system tables

If these tables are missing, DO NOT create them - investigate why the environment was reset.

### Troubleshooting

**Local Development Issues:**
1. **Start local services**: `supabase start`
2. **Reset local database**: `supabase db reset`
3. **Check local logs**: `supabase logs`

**Production Issues:**
1. **Check MCP connection**: Verify MCP tools can connect
2. **Review production logs**: Use `mcp_supabase_get_logs`
3. **Consult before changes**: Always confirm before production modifications

### Emergency Contacts

If there are issues with the Supabase environment:
- Confirm with user before any destructive operations
- Document any environment changes
- Always backup before major changes

## Summary

**DEVELOPMENT**: Use local Supabase (`supabase start`) for all development work
**PRODUCTION**: MCP tools connect to `xwxuwchndgxnnmfprzds` for monitoring and inspection
**NEVER USE**: Old project references (`wxmtfsexxhkjwgrejmji`)

This dual environment setup provides safe development isolation while maintaining production access for monitoring.