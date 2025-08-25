# Supabase Environment Recovery Plan

## Current Situation

The `add-email` preview branch appears to have been deleted or reset, resulting in:
- No tables in the public schema
- Missing sample data
- Empty migrations list
- No preview branches available

## Recovery Options

### Option 1: Recreate Preview Branch (Recommended)
1. Create a new `add-email` preview branch
2. Apply all existing migrations
3. Restore sample data
4. Verify email system functionality

### Option 2: Use Existing Main Branch
1. Switch to main production branch (NOT recommended for development)
2. Risk of affecting live data

### Option 3: Use Local Development
1. Switch to local Supabase (NOT recommended per steering docs)
2. Would require reconfiguring entire environment

## Recommended Recovery Steps

1. **Create new preview branch**:
   ```bash
   # This will create a fresh preview branch with main branch schema
   mcp_supabase_create_branch with name "add-email"
   ```

2. **Apply email system migrations**:
   ```bash
   # Apply our custom email system migrations
   mcp_supabase_apply_migration for each migration file
   ```

3. **Restore sample data**:
   ```bash
   # Insert sample invitation tokens and test data
   mcp_supabase_execute_sql with sample data queries
   ```

4. **Verify functionality**:
   ```bash
   # Test email functions and database operations
   Test all email endpoints and database queries
   ```

## Migration Files to Apply

1. `20250817000001_production_email_system_setup.sql`
2. `20250819000002_email_triggers.sql` 
3. `20250819000003_email_functions.sql`

## Sample Data to Restore

- Sample invitation tokens
- Test user roles
- Email event logs
- Audit log entries

## Verification Checklist

- [ ] Preview branch `add-email` exists
- [ ] All email system tables present
- [ ] Sample data restored
- [ ] Email functions deployable
- [ ] Health checks pass
- [ ] Email sending works

## Prevention

To prevent this from happening again:
- Document branch lifecycle
- Regular backups of sample data
- Monitor branch status
- Clear communication about branch management