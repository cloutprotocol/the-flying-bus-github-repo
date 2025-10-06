-- Migration: Update RLS policies for registration (v2)
-- This migration addresses authentication flow issues by updating RLS policies
-- to allow proper profile creation during both standard and invitation registration

-- First, let's create a function to check if we're in a registration context
CREATE OR REPLACE FUNCTION public.is_registration_context()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Check if the current role is service_role (used during registration)
  -- or if there's an active registration context
  SELECT 
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.registration_contexts 
      WHERE user_id = auth.uid() 
      AND completed_at IS NULL
      AND created_at > NOW() - INTERVAL '10 minutes'
    );
$$;

-- Create a function to allow service role operations during registration
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
    -- Allow if admin is creating profile
    (SELECT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ));
$$;

-- Drop existing profile INSERT policy and create new one that allows registration
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Allow profile creation during registration" ON public.profiles
  FOR INSERT 
  WITH CHECK (
    can_create_profile_during_registration(id)
  );

-- Add a policy specifically for service role operations (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service role can manage profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage profiles" ON public.profiles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- Create a function to track registration attempts
CREATE OR REPLACE FUNCTION public.create_registration_context(
  p_user_id uuid,
  p_registration_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  context_id uuid;
BEGIN
  -- Insert registration context
  INSERT INTO public.registration_contexts (
    user_id,
    registration_type,
    metadata
  ) VALUES (
    p_user_id,
    p_registration_type,
    p_metadata
  ) RETURNING id INTO context_id;
  
  RETURN context_id;
END;
$$;-- Cre
ate a function to complete registration context
CREATE OR REPLACE FUNCTION public.complete_registration_context(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark registration as completed
  UPDATE public.registration_contexts 
  SET completed_at = NOW()
  WHERE user_id = p_user_id 
  AND completed_at IS NULL;
END;
$$;

-- Create a function to clean up old registration contexts
CREATE OR REPLACE FUNCTION public.cleanup_old_registration_contexts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete registration contexts older than 1 hour that are incomplete
  DELETE FROM public.registration_contexts 
  WHERE created_at < NOW() - INTERVAL '1 hour'
  AND completed_at IS NULL;
  
  -- Delete completed registration contexts older than 7 days
  DELETE FROM public.registration_contexts 
  WHERE completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Add missing RLS policy for registration_contexts table (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'registration_contexts' 
    AND policyname = 'System can create registration contexts'
  ) THEN
    EXECUTE 'CREATE POLICY "System can create registration contexts" ON public.registration_contexts
      FOR INSERT
      WITH CHECK (
        auth.role() = ''service_role'' OR
        is_admin()
      )';
  END IF;
END $$;

-- Create an RPC function for testing registration scenarios
CREATE OR REPLACE FUNCTION public.test_registration_permissions(
  test_user_id uuid,
  test_registration_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  context_id uuid;
  can_create boolean;
BEGIN
  -- Test if we can create a registration context
  BEGIN
    context_id := create_registration_context(test_user_id, test_registration_type);
    result := jsonb_set(result, '{context_creation}', 'true');
    result := jsonb_set(result, '{context_id}', to_jsonb(context_id));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{context_creation}', 'false');
    result := jsonb_set(result, '{context_error}', to_jsonb(SQLERRM));
  END;
  
  -- Test if we can check profile creation permissions
  BEGIN
    SELECT can_create_profile_during_registration(test_user_id) INTO can_create;
    result := jsonb_set(result, '{can_create_profile}', to_jsonb(can_create));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{profile_check_error}', to_jsonb(SQLERRM));
  END;
  
  -- Test registration context check
  BEGIN
    SELECT is_registration_context() INTO can_create;
    result := jsonb_set(result, '{is_registration_context}', to_jsonb(can_create));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{context_check_error}', to_jsonb(SQLERRM));
  END;
  
  RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_registration_context() TO public, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_profile_during_registration(uuid) TO public, service_role;
GRANT EXECUTE ON FUNCTION public.create_registration_context(uuid, text, jsonb) TO public, service_role;
GRANT EXECUTE ON FUNCTION public.complete_registration_context(uuid) TO public, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_registration_contexts() TO service_role;
GRANT EXECUTE ON FUNCTION public.test_registration_permissions(uuid, text) TO public, service_role;

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_registration_contexts_user_id_active 
ON public.registration_contexts (user_id, created_at) 
WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_registration_contexts_cleanup 
ON public.registration_contexts (created_at, completed_at);

-- Add a comment explaining the changes
COMMENT ON POLICY "Allow profile creation during registration" ON public.profiles IS 
'Allows profile creation during registration by service role, users creating their own profile, or admins';

COMMENT ON FUNCTION public.is_registration_context() IS 
'Checks if current context allows registration operations (service role or active registration context)';

COMMENT ON FUNCTION public.can_create_profile_during_registration(uuid) IS 
'Determines if profile creation is allowed for the given user ID during registration';

COMMENT ON FUNCTION public.create_registration_context(uuid, text, jsonb) IS 
'Creates a registration context for tracking and auditing registration processes';

COMMENT ON FUNCTION public.complete_registration_context(uuid) IS 
'Marks a registration context as completed';

COMMENT ON FUNCTION public.cleanup_old_registration_contexts() IS 
'Cleans up old registration contexts to prevent table bloat';