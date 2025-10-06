-- Fix invitation token RLS policy to allow unauthenticated access for valid tokens
-- This allows tokenized URLs to work without requiring authentication

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can access own invitation tokens" ON invitation_tokens;

-- Drop the service role policy to recreate it
DROP POLICY IF EXISTS "Service role can manage all tokens" ON invitation_tokens;

-- Create a new policy that allows access to valid, unexpired, unused tokens
-- This enables the tokenized URLs to work for unauthenticated users
CREATE POLICY "Allow access to valid invitation tokens" ON invitation_tokens
  FOR SELECT
  USING (
    -- Allow service role full access
    auth.role() = 'service_role'
    OR
    -- Allow admin/moderator access
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = ANY(ARRAY['admin', 'moderator'])
      )
    )
    OR
    -- Allow access to valid tokens (not used and not expired)
    -- This is the key fix - allows unauthenticated access to valid tokens
    (
      used_at IS NULL 
      AND expires_at > NOW()
      AND EXISTS (
        SELECT 1 FROM invitation_requests 
        WHERE invitation_requests.id = invitation_request_id 
        AND invitation_requests.status = 'approved'
      )
    )
  );

-- Recreate the service role policy for full management access
CREATE POLICY "Service role can manage all tokens" ON invitation_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add a comment explaining the policy
COMMENT ON POLICY "Allow access to valid invitation tokens" ON invitation_tokens IS 
'Allows unauthenticated access to valid (unused, unexpired, approved) invitation tokens. This enables tokenized URLs to work without requiring users to be logged in first.';