# Design Document

## Overview

The RLS policy issue stems from conflicting INSERT policies on the profiles table. The current setup has two INSERT policies that create a circular dependency when the `is_admin()` function tries to check the profiles table during profile creation.

## Architecture

The solution involves simplifying the RLS policies to remove the circular dependency while maintaining security:

1. **Remove conflicting policies**: Drop the "Only admins can create profiles" policy that causes the circular dependency
2. **Simplify INSERT policy**: Keep only the "Users can insert own profile" policy which allows users to create profiles with their own `auth.uid()`
3. **Admin profile creation**: Handle admin profile creation through a different mechanism (service role or function)

## Components and Interfaces

### Current Problematic Policies
- "Only admins can create profiles" - `with_check: (is_admin() OR (auth.uid() = id))`
- "Users can insert own profile" - `with_check: (auth.uid() = id)`

### Proposed Solution
- Single INSERT policy: "Users can insert own profile" - `with_check: (auth.uid() = id)`
- Remove the admin check policy that causes circular dependency

## Data Models

No changes to data models are required. The profiles table structure remains the same.

## Error Handling

- Clear error messages when profile creation fails
- Proper validation of auth.uid() during profile creation
- Fallback mechanisms for admin operations

## Testing Strategy

1. Test new user registration flow
2. Test profile creation with valid auth.uid()
3. Test that users cannot create profiles for other users
4. Verify existing profiles remain accessible