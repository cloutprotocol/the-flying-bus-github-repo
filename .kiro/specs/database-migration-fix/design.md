# Design Document

## Overview

The database migration fix involves correcting SQL syntax errors in the invitation token management functions migration file. The primary issue is improper use of dollar-quoted strings, which are used in PostgreSQL to define function bodies without escaping quotes. The current migration uses single `$` characters instead of proper dollar-quoted delimiters like `$$` or named delimiters like `$function$`.

## Architecture

### Migration File Structure
- **Current State**: Migration file `20250125_invitation_token_management_functions.sql` contains syntax errors
- **Target State**: Corrected migration file with proper PostgreSQL syntax
- **Approach**: Fix the existing migration file in place to maintain migration history

### SQL Function Syntax Standards
- Use `$$` as the standard dollar-quoted delimiter for simple functions
- Use named delimiters like `$function$` for complex functions that might contain nested dollar quotes
- Maintain consistent indentation and formatting
- Include proper error handling and security definer settings

## Components and Interfaces

### Migration File Components
1. **Function Definitions**: 9 stored procedures for invitation token management
2. **View Definition**: Admin token overview view
3. **Permission Grants**: Execute permissions for authenticated users
4. **RLS Policies**: Row-level security for admin access
5. **Comments**: Documentation for each function

### Function Categories
1. **Token Management**: `regenerate_invitation_token`, `extend_invitation_token_expiry`
2. **Token Retrieval**: `get_invitation_token_info`, `get_active_invitation_tokens`, `get_expiring_invitation_tokens`
3. **Statistics**: `get_invitation_token_stats`, `get_invitation_token_history`
4. **Validation**: `validate_invitation_token_detailed`
5. **Cleanup**: `cleanup_expired_tokens_detailed`, `schedule_token_cleanup`

## Data Models

### Affected Tables
- `invitation_tokens`: Core table for token storage
- `invitation_requests`: Related table for invitation data
- `admin_token_overview`: View combining both tables

### Function Return Types
- Most functions return TABLE types with specific column definitions
- Boolean return types for validation and extension functions
- Void return type for cleanup scheduling function

## Error Handling

### SQL Syntax Validation
- Validate all dollar-quoted strings use proper delimiters
- Ensure all function definitions are properly terminated
- Check that all DECLARE blocks are correctly formatted

### Migration Safety
- Preserve existing function logic and behavior
- Maintain all security definer settings
- Keep all permission grants and RLS policies intact

## Testing Strategy

### Syntax Validation
1. **Static Analysis**: Parse SQL file for syntax errors before applying
2. **Migration Test**: Run `supabase start` to verify migration applies successfully
3. **Function Testing**: Execute each function to ensure they work as expected

### Functional Testing
1. **Token Generation**: Test `regenerate_invitation_token` creates valid tokens
2. **Token Validation**: Test `validate_invitation_token_detailed` returns correct status
3. **Statistics**: Test `get_invitation_token_stats` returns accurate counts
4. **Cleanup**: Test `cleanup_expired_tokens_detailed` removes only expired tokens

### Integration Testing
1. **Database Startup**: Verify `supabase start` completes without errors
2. **Migration History**: Ensure migration is recorded in schema_migrations table
3. **Permission Verification**: Test that authenticated users can execute functions