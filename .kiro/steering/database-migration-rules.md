# Database Migration Rules - MANDATORY

## CRITICAL RULE: All Database Changes MUST Use Migration Files

**⚠️ MANDATORY**: All database schema changes, table creation, column additions, function creation, and data modifications MUST be tracked through migration files. Direct SQL execution is PROHIBITED except for read-only queries.

## ABSOLUTE PROHIBITIONS - NEVER DO THESE

❌ **NEVER use `mcp_supabase_production_apply_migration`** - This applies directly to production database
❌ **NEVER use any MCP Supabase tool for schema changes** - MCP tools are for READ-ONLY operations only
❌ **NEVER bypass the local → PR → production workflow**
❌ **NEVER apply migrations directly to production (`xwxuwchndgxnnmfprzds`)**
❌ **NEVER use `mcp_supabase_production_execute_sql` for CREATE/ALTER/DROP operations**
❌ **NEVER use `supabase db push`** - This pushes migrations to the remote PRODUCTION database
❌ **NEVER use `supabase db push --project-ref xwxuwchndgxnnmfprzds`** - Direct production push

## ONLY ALLOWED WORKFLOW FOR DATABASE CHANGES

✅ **Create migration file** → ✅ **Test locally with `supabase db reset`** → ✅ **Commit to git** → ✅ **PR process handles production**

## CRITICAL: LOCAL-ONLY COMMANDS

✅ **For LOCAL testing ONLY:**
- `supabase start` - Start local Supabase
- `supabase db reset` - Apply ALL migrations to local database (NEVER adds --project-ref)
- `supabase stop` - Stop local Supabase

❌ **NEVER use these commands (they push to PRODUCTION):**
- `supabase db push` - Pushes to remote production database
- `supabase db push --project-ref [any-id]` - Direct production push
- Any command with `--project-ref` flag when doing schema changes

## DECISION TREE: Database Changes

**Question: Do I need to change database schema/structure?**
- YES → Create migration file → Test with `supabase db reset` locally → Commit
- NO → Continue with read-only operations

**Question: Should I use MCP Supabase tools?**
- For READ-ONLY queries (`mcp_supabase_production_execute_sql` with SELECT): ✅ YES
- For schema changes (CREATE/ALTER/DROP): ❌ NO - Use migration files only
- For production modifications: ❌ NO - Use local testing + PR process

**Question: Should I use `supabase db push`?**
- ❌ NO - This command pushes directly to PRODUCTION database
- ✅ Use `supabase db reset` for local testing instead

**Question: Am I about to modify production directly?**
- If YES → ❌ STOP - Use local testing + PR process instead

## BEFORE ANY DATABASE OPERATION - MANDATORY CHECKLIST

Before taking any database action, I must ask:

1. "Is this a schema change?" → If YES, create migration file
2. "Am I about to modify production directly?" → If YES, STOP - use local testing
3. "Can this wait for PR process?" → If YES, follow proper workflow
4. "Is this read-only?" → If NO, use migration files

## RED FLAGS - STOP IMMEDIATELY IF YOU SEE:
- `mcp_supabase_production_apply_migration` in any context
- Any MCP tool being used for CREATE/ALTER/DROP operations
- Direct production modifications outside of PR process
- Bypassing local testing for schema changes
- `supabase db push` command being used (pushes to production!)
- Any `--project-ref` flag with schema modification commands

## REQUIRED STATEMENT BEFORE DATABASE CHANGES

Before any database operation, I must explicitly state:

"I am about to [describe action]. This will:
- ✅/❌ Create a migration file
- ✅/❌ Test locally only  
- ✅/❌ Follow PR process for production
- ✅/❌ Use read-only MCP operations only"

### Why This Is Critical

1. **Version Control**: All database changes must be tracked in git
2. **Reproducibility**: Other developers and environments need the same schema
3. **Rollback Capability**: Migration files allow for proper rollback procedures
4. **Audit Trail**: Complete history of database changes
5. **Environment Consistency**: Ensures all environments have identical schemas

### Correct Implementation Pattern

#### ✅ CORRECT: Migration File Approach

```bash
# 1. Create migration file
supabase migration new descriptive_migration_name

# 2. Write SQL in the migration file
# Edit supabase/migrations/YYYYMMDDHHMMSS_descriptive_migration_name.sql

# 3. For LOCAL testing - apply to local database
supabase start  # Start local Supabase
supabase db reset  # Apply all migrations to local DB
# OR apply specific migration locally
supabase db push  # (without --project-ref for local)

# 4. For REMOTE testing - create PR to trigger preview branch
# GitHub PR will automatically create preview database with migrations
```

#### ❌ INCORRECT: Direct SQL Execution

```bash
# This is PROHIBITED for schema changes
mcp_supabase_execute_sql "CREATE TABLE new_table (...)"
mcp_supabase_execute_sql "ALTER TABLE existing_table ADD COLUMN ..."
mcp_supabase_execute_sql "CREATE FUNCTION new_function() ..."
```

### When Migration Files Are Required

**ALWAYS use migration files for:**
- Creating tables, views, indexes
- Altering table structure (add/drop/modify columns)
- Creating/modifying functions, triggers, procedures
- Adding/modifying constraints, foreign keys
- Creating/modifying RLS policies
- Schema changes of any kind
- Data migrations that affect structure
- Extension installations

### When Direct SQL Is Acceptable

**ONLY use direct SQL for:**
- Read-only queries (SELECT statements)
- Temporary data inspection
- Testing queries before writing migrations
- One-time data fixes (with explicit user approval)

### Migration File Naming Convention

Use descriptive names that explain the change:
```
20250101000001_create_user_profiles_table.sql
20250101000002_add_email_verification_column.sql
20250101000003_create_notification_functions.sql
20250101000004_update_rls_policies_for_articles.sql
```

### Immediate Testing Workflow

When you need to test database changes immediately:

1. **Create migration file first**:
   ```sql
   -- supabase/migrations/20250101000001_add_new_feature.sql
   CREATE TABLE new_feature (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     created_at timestamptz DEFAULT now()
   );
   ```

2. **Apply migration to LOCAL database for testing**:
   ```bash
   # Start local Supabase if not running
   supabase start
   
   # Apply migration to local database
   supabase db reset  # Applies all migrations including new one
   # OR
   supabase db push  # Apply pending migrations to local DB
   ```

3. **Test locally, then commit migration file**:
   ```bash
   git add supabase/migrations/20250101000001_add_new_feature.sql
   git commit -m "Add new feature table"
   ```

4. **For remote testing - create PR**:
   ```bash
   git push origin feature-branch
   # Create PR on GitHub - this triggers Supabase preview branch creation
   ```

### Migration File Structure

Each migration file should:
- Have a clear, descriptive name
- Include comments explaining the purpose
- Be idempotent when possible
- Include rollback instructions in comments

Example:
```sql
-- Migration: Add user notification preferences
-- Purpose: Allow users to customize their notification settings
-- Rollback: DROP TABLE user_notification_preferences;

CREATE TABLE user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

### Exception Handling

If you absolutely must use direct SQL (rare cases):
1. **Get explicit user approval first**
2. **Document the reason in comments**
3. **Create a corresponding migration file afterward**
4. **Test the migration file on a clean database**

### Verification Steps

Before applying any database changes:
1. **Verify migration file exists** in `supabase/migrations/`
2. **Review SQL for syntax and logic errors**
3. **Check for potential conflicts with existing schema**
4. **Ensure proper naming convention**
5. **Test on development environment first**

### Tools and Commands

#### Creating Migrations
```bash
# Create new migration file
supabase migration new feature_name

# Generate migration from local schema diff
supabase db diff
```

#### Applying Migrations

**For LOCAL testing:**
```bash
# Start local Supabase
supabase start

# Apply all migrations to local database
supabase db reset

# Apply pending migrations to local database
supabase db push
```

**For REMOTE testing:**
```bash
# Create PR on GitHub - this automatically creates preview branch
# with all migrations applied

# Check remote migration status (production)
mcp_supabase_list_migrations

# Check remote schema (production)
mcp_supabase_list_tables
```

#### Local Development Commands
```bash
# Check local migration status
supabase migration list

# Check local schema
supabase db diff --schema public
```

### Emergency Procedures

If direct SQL was used accidentally:
1. **Stop immediately**
2. **Document what was changed**
3. **Create migration file with the same changes**
4. **Test migration file on clean environment**
5. **Commit migration file to version control**

### Database Environment Strategy

**LOCAL DEVELOPMENT:**
- Use `supabase start` for local database
- Apply migrations with `supabase db reset` or `supabase db push`
- Test features locally before committing

**REMOTE TESTING:**
- Create GitHub PR to trigger Supabase preview branch
- Preview branch automatically applies all migrations
- Test on preview branch before merging

**PRODUCTION:**
- Never apply migrations directly to production (`xwxuwchndgxnnmfprzds`)
- Production updates happen through PR merge process
- Supabase handles production migration deployment

### Summary

**ALWAYS CREATE MIGRATION FILES FIRST**
**TEST LOCALLY WITH LOCAL DATABASE**
**USE PR PROCESS FOR REMOTE TESTING**
**NEVER USE DIRECT SQL FOR SCHEMA CHANGES**
**NEVER USE MCP TOOLS FOR PRODUCTION SCHEMA CHANGES**
**TRACK ALL DATABASE CHANGES IN VERSION CONTROL**

## ACCOUNTABILITY MECHANISM

Every database operation must follow this pattern:
1. **State intention clearly** with the required statement above
2. **Verify against prohibitions** - check the red flags list
3. **Follow only allowed workflow** - migration file → local test → PR
4. **Never take shortcuts** - production safety depends on this process

This ensures database consistency, reproducibility, and proper change management across all environments while preventing accidental production modifications.