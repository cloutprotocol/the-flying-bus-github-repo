-- Migration: Add missing profile creation trigger for auth.users
-- This trigger automatically creates a profile when a new user signs up
-- The handle_new_user() function already exists in the schema

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Profile creation trigger added successfully';
  RAISE NOTICE 'New users will now automatically get a profile record created';
END $$;
