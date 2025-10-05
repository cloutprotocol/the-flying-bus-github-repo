# Profile Creation Trigger Fix Report

**Date**: October 4, 2025  
**Issue**: New users signing up via magic link couldn't log in  
**Root Cause**: Missing database trigger to create profile records

## Problem Summary

When users signed up via the invitation magic link:
1. ✅ Auth record was created in `auth.users`
2. ❌ Profile record was NOT created in `profiles` table
3. ❌ Login failed with error: "Cannot coerce the result to a single JSON object" (406 error)

### Error Details

```
GET http://127.0.0.1:54321/rest/v1/profiles?select=*&id=eq.3fef56e5-ad2f-440c-bd8f-70f3b850370a 406 (Not Acceptable)
Error: Cannot coerce the result to a single JSON object
Details: The result contains 0 rows
```

## Root Cause Analysis

### Why It Worked in Production But Not Locally

The production database had a trigger `on_auth_user_created` that automatically creates a profile when a new user signs up. However, this trigger was **missing from the local database** because:

1. The `handle_new_user()` function existed in the schema (from `20251001203838_remote_schema.sql`)
2. But the **trigger connecting it to `auth.users` was missing**
3. When we switched to local development, the trigger wasn't applied

### The Missing Trigger

Production had this trigger (but it wasn't in migrations):
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Solution Implemented

### Migration Created

**File**: `supabase/migrations/20251004210000_add_missing_profile_creation_trigger.sql`

```sql
-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### What the Trigger Does

When a new user signs up, the `handle_new_user()` function:
1. Extracts username and display_name from signup metadata
2. Ensures username is unique (appends random numbers if needed)
3. Creates a profile record with:
   - Same ID as auth user
   - Username (from metadata or email)
   - Display name (from metadata or email)
   - Email
   - Default role: 'reader'
   - Avatar URL (if provided)
   - Empty bio

### Applied to Local Database

```bash
supabase db reset
```

Result: ✅ Trigger successfully created and verified

## Verification

```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

Result:
```
     trigger_name     | event_manipulation | event_object_table 
----------------------+--------------------+--------------------
 on_auth_user_created | INSERT             | users
```

## Why Admin Worked But New User Didn't

- **Admin account**: Already had a profile record in the database (created manually or via earlier process)
- **New user**: Only had auth record, no profile record → 406 error when fetching profile

## Port Issue (Separate from Main Problem)

The magic link URL had port 5723 instead of 8080. This is a **separate issue** related to:
- Local dev server configuration
- Environment variable for redirect URLs
- Not related to the profile creation problem

**Fix**: Manually changed URL to port 8080 (where local dev server runs)

## Testing Recommendations

1. **Test new user signup flow**:
   - Submit invitation request
   - Admin approves
   - User receives magic link
   - User clicks magic link and signs up
   - Verify profile is created automatically

2. **Verify trigger works**:
   ```sql
   -- After signup, check both tables
   SELECT id, email FROM auth.users WHERE email = 'test@example.com';
   SELECT id, username, email, role FROM profiles WHERE email = 'test@example.com';
   ```

3. **Check for existing users without profiles**:
   ```sql
   SELECT u.id, u.email 
   FROM auth.users u
   LEFT JOIN profiles p ON u.id = p.id
   WHERE p.id IS NULL;
   ```

## Next Steps

1. ✅ Migration created and applied locally
2. ⏳ Test complete signup flow with new user
3. ⏳ Commit migration to git
4. ⏳ Deploy to production (if needed - production may already have this trigger)

## Prevention

This issue occurred because:
1. Production database had manual changes not tracked in migrations
2. When switching to local development, those changes were missing

**Solution**: Always ensure database changes are tracked in migration files, even if applied manually to production first.

## Related Files

- Migration: `supabase/migrations/20251004210000_add_missing_profile_creation_trigger.sql`
- Function: `handle_new_user()` in `20251001203838_remote_schema.sql`
- Auth Service: `src/services/authService.ts` (fetches profile after login)
- Auth Provider: `src/contexts/AuthProvider.tsx` (handles login flow)
