-- Fix RLS policy for profile creation during registration
-- The issue is that the handle_new_user trigger function runs without proper auth context

-- First, let's update the handle_new_user function to bypass RLS for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- This will work because the function is SECURITY DEFINER and we have a service role policy
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
    
    -- Also create privacy settings for the new user
    INSERT INTO public.privacy_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Update the RLS policy to be more permissive for profile creation during registration
-- The key insight is that we need to allow the service role (which the trigger runs as) to create profiles
DROP POLICY IF EXISTS "Allow profile creation during registration" ON profiles;
CREATE POLICY "Allow profile creation during registration" ON profiles
FOR INSERT
WITH CHECK (
    -- Allow service role (for triggers and system operations)
    auth.role() = 'service_role' OR
    -- Allow authenticated users to create their own profile
    auth.uid() = id OR
    -- Allow if no current user (for system operations)
    auth.uid() IS NULL
);

-- Also ensure we have a comprehensive service role policy
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles" ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions to the service role
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.privacy_settings TO service_role;

-- Update the can_create_profile_during_registration function to be more robust
CREATE OR REPLACE FUNCTION public.can_create_profile_during_registration(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    -- Allow if service role
    auth.role() = 'service_role' OR
    -- Allow if user is creating their own profile
    auth.uid() = profile_user_id OR
    -- Allow if no auth context (system operations)
    auth.uid() IS NULL OR
    -- Allow if admin is creating profile
    (SELECT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ));
$$;