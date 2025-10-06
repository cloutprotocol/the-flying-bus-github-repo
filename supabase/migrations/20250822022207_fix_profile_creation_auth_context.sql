-- Fix RLS policy for profile creation to handle authentication context properly during registration

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow profile creation during registration" ON profiles;

-- Create an improved policy that better handles authentication context
CREATE POLICY "Allow profile creation during registration" ON profiles
  FOR INSERT
  WITH CHECK (
    -- Service role can always create profiles
    auth.role() = 'service_role'
    OR
    -- Users can create their own profile (normal case)
    auth.uid() = id
    OR
    -- Allow creation when auth.uid() is null (during trigger execution)
    -- but only if the user exists in auth.users
    (auth.uid() IS NULL AND EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id
    ))
  );

-- Also ensure the handle_new_user function has proper error handling
-- and uses the correct authentication context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    default_username TEXT;
    user_display_name TEXT;
    profile_created BOOLEAN := FALSE;
BEGIN
    -- Get username and display_name from signup metadata
    default_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
    
    -- Ensure username is unique by appending numbers if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = default_username) LOOP
        default_username := split_part(NEW.email, '@', 1) || '_' || floor(random() * 1000)::text;
    END LOOP;
    
    -- Insert new profile using the signup data
    -- This function runs as SECURITY DEFINER with elevated privileges
    BEGIN
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
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            ''
        );
        
        profile_created := TRUE;
        
        RAISE LOG 'Profile created successfully for user %: username=%, display_name=%', 
                  NEW.id, default_username, user_display_name;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Failed to create profile for user %: % (SQLSTATE: %)', 
                      NEW.id, SQLERRM, SQLSTATE;
            -- Don't fail the user creation, just log the error
    END;
    
    -- Also create privacy settings for the new user (if profile was created)
    IF profile_created THEN
        BEGIN
            INSERT INTO public.privacy_settings (user_id) VALUES (NEW.id)
            ON CONFLICT (user_id) DO NOTHING;
            
            RAISE LOG 'Privacy settings created for user %', NEW.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Failed to create privacy settings for user %: %', NEW.id, SQLERRM;
                -- Don't fail if privacy settings creation fails
        END;
    END IF;
    
    RETURN NEW;
END;
$$;