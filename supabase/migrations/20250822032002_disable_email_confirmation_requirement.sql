-- Migration to disable email confirmation requirement
-- This automatically confirms emails for new users to provide instant access

-- Create a function to automatically confirm user emails
CREATE OR REPLACE FUNCTION auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set email_confirmed_at to the current timestamp for new users
  -- This effectively disables the email confirmation requirement
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that runs before inserting new users
DROP TRIGGER IF EXISTS trigger_auto_confirm_email ON auth.users;
CREATE TRIGGER trigger_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user_email();

-- Also create a function to confirm existing unconfirmed users (for cleanup)
CREATE OR REPLACE FUNCTION confirm_all_existing_users()
RETURNS void AS $$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
  WHERE email_confirmed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to confirm all existing users
SELECT confirm_all_existing_users();

-- Add a comment explaining this configuration
COMMENT ON FUNCTION auto_confirm_user_email() IS 'Automatically confirms user emails on signup to provide instant access without email confirmation requirement';
COMMENT ON FUNCTION confirm_all_existing_users() IS 'One-time function to confirm all existing unconfirmed users';