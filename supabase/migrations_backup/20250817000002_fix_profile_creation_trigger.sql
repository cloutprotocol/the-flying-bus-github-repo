-- Fix Profile Creation Trigger
-- This migration creates the missing trigger that automatically creates profiles when users sign up
-- and removes manual profile creation from the application code

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_username TEXT;
    user_display_name TEXT;
BEGIN
    -- Get username and display_name from signup metadata
    default_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
    
    -- Ensure username is unique by appending numbers if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = default_username) LOOP
        default_username := split_part(NEW.email, '@', 1) || '_' || floor(random() * 1000)::text;
    END LOOP;
    
    -- Insert new profile using the signup data
    INSERT INTO public.profiles (
        id,
        username,
        display_name,
        email,
        role,
        avatar_url,
        bio
    ) VALUES (
        NEW.id,
        default_username,
        user_display_name,
        NEW.email,
        'reader',
        '',
        ''
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile when a new user signs up through Supabase Auth';