# Implementation Plan

- [x] 1. Drop the conflicting RLS policy
  - Remove the "Only admins can create profiles" policy that causes circular dependency
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 2. Verify the remaining RLS policies are correct
  - Confirm "Users can insert own profile" policy allows proper profile creation
  - Ensure other policies (SELECT, UPDATE) remain functional
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 3. Create automatic profile creation trigger
  - Create handle_new_user() function to automatically create profiles
  - Add trigger on auth.users INSERT to call the function
  - _Requirements: 1.1, 1.2_

- [x] 4. Remove manual profile creation from application
  - Remove manual profile creation from registerUser function
  - Let the database trigger handle profile creation automatically
  - _Requirements: 1.1, 2.1_

- [x] 5. Test the fix
  - Verify new user registration works without RLS violations
  - Test that users can only create profiles with their own auth.uid()
  - _Requirements: 1.1, 1.2, 1.3_