# Supabase Preview Failure Analysis

## 🚨 CRITICAL ISSUE IDENTIFIED

**Error**: `relation "profiles" does not exist (SQLSTATE 42P01)`

**Root Cause**: **Missing Core Schema Migration**

## Problem Analysis

### The Issue
The Supabase preview branch fails because:

1. **Migration `20250105000001_storage_bucket_policies.sql`** (January 5, 2025) creates storage policies that reference the `profiles` table
2. **The `profiles` table is not created until `20251001203838_remote_schema.sql`** (October 1, 2025)
3. **This creates a dependency order violation** - policies reference a table that doesn't exist yet

### Failing Code
```sql
-- In 20250105000001_storage_bucket_policies.sql (line 32-48)
CREATE POLICY "Media bucket owner delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND (
    -- Admin users can delete any file
    (
      auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'  -- ❌ profiles table doesn't exist yet
      )
    )
  )
);
```

### Migration Timeline Problem
```
2025-01-05: storage_bucket_policies.sql  ← References profiles table
2025-08-16: email_system_base_schema.sql
2025-08-17: production_email_system_setup.sql
...
2025-10-01: remote_schema.sql           ← Creates profiles table (TOO LATE!)
```

## Root Cause Analysis

### What We Discovered During Migration Recovery

1. **We extracted 96 migration files from production** - but these were only the email system migrations
2. **We missed the core application schema** - the fundamental tables like `profiles`, `articles`, etc.
3. **The `20250819163038_remote_schema.sql` file is incomplete** - it doesn't contain the profiles table
4. **The `20250819163038_comprehensive_schema_from_working_database.sql` is still a placeholder**

### The Missing Piece

The `profiles` table exists in `local_schema_dump.sql` but was never properly migrated to the migration files:

```sql
-- From local_schema_dump.sql (line 4361)
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    bio text,
    email text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    crypto_wallet_address text,
    badge_display_preferences jsonb DEFAULT '{}'::jsonb,
    public_bio text,
    favorite_categories text[]
);
```

## Solutions

### Option 1: Create Early Profiles Migration (RECOMMENDED)

Create a new migration file with an early timestamp that creates the core schema:

```sql
-- 20250101000001_create_core_application_schema.sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    bio text,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    crypto_wallet_address text,
    badge_display_preferences jsonb DEFAULT '{}'::jsonb,
    public_bio text,
    favorite_categories text[]
);

-- Add primary key and constraints
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Option 2: Fix Storage Policies to be Conditional

Modify the storage policies to handle missing profiles table:

```sql
-- In 20250105000001_storage_bucket_policies.sql
CREATE POLICY "Media bucket owner delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND (
    -- Users can delete their own avatar files
    (name LIKE 'avatars/' || auth.uid()::text || '/%')
    OR
    -- Users can delete files they uploaded
    (owner = auth.uid())
    OR
    -- Admin users can delete any file (only if profiles table exists)
    (
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
      AND auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      )
    )
  )
);
```

### Option 3: Extract Complete Schema from Production

Use MCP tools to extract the complete schema including core tables from production.

## Immediate Action Required

The preview branch failure indicates that **we're missing fundamental application schema** that should exist before the email system migrations.

### Next Steps

1. **Identify all missing core tables** (profiles, articles, comments, etc.)
2. **Create early migration files** for core schema (before 2025-01-05)
3. **Test migration sequence** on clean database
4. **Update remote schema files** with complete schema

## Impact Assessment

- **Severity**: HIGH - Blocks all preview branch deployments
- **Scope**: Affects all new Supabase preview branches
- **Timeline**: Must be fixed before any new deployments
- **Risk**: Could affect production if schema drift exists

## Prevention

This issue occurred because:
1. We focused on email system migrations only
2. We didn't verify core application schema completeness
3. The migration extraction process was incomplete

**Recommendation**: Always verify complete schema dependencies when extracting migrations from production.