-- Additional Token Management Functions for Invitation Approval Workflow
-- This migration adds comprehensive token management stored procedures

-- Function to regenerate a token for an invitation (admin functionality)
CREATE OR REPLACE FUNCTION regenerate_invitation_token(invitation_id_input UUID)
RETURNS TABLE(
  token_id UUID,
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $
DECLARE
  new_token TEXT;
  new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate new cryptographically secure token
  new_token := encode(gen_random_bytes(32), 'base64url');
  new_expires_at := NOW() + INTERVAL '30 days';
  
  -- Mark any existing unused tokens as used (invalidate them)
  UPDATE invitation_tokens 
  SET used_at = NOW() 
  WHERE invitation_request_id = invitation_id_input 
    AND used_at IS NULL;
  
  -- Insert new token
  RETURN QUERY
  INSERT INTO invitation_tokens (invitation_request_id, token, expires_at)
  VALUES (invitation_id_input, new_token, new_expires_at)
  RETURNING id, invitation_tokens.token, invitation_tokens.expires_at, invitation_tokens.created_at;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get token information for an invitation
CREATE OR REPLACE FUNCTION get_invitation_token_info(invitation_id_input UUID)
RETURNS TABLE(
  token_id UUID,
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  is_expired BOOLEAN,
  is_used BOOLEAN
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    it.id,
    it.token,
    it.expires_at,
    it.used_at,
    it.created_at,
    (it.expires_at < NOW()) as is_expired,
    (it.used_at IS NOT NULL) as is_used
  FROM invitation_tokens it
  WHERE it.invitation_request_id = invitation_id_input
  ORDER BY it.created_at DESC
  LIMIT 1;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active (unused, non-expired) tokens
CREATE OR REPLACE FUNCTION get_active_invitation_tokens()
RETURNS TABLE(
  token_id UUID,
  invitation_request_id UUID,
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  parent_name TEXT,
  parent_email TEXT,
  child_name TEXT,
  invitation_status TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    it.id,
    it.invitation_request_id,
    it.token,
    it.expires_at,
    it.created_at,
    ir.parent_name,
    ir.parent_email,
    ir.child_name,
    ir.status
  FROM invitation_tokens it
  JOIN invitation_requests ir ON it.invitation_request_id = ir.id
  WHERE it.expires_at > NOW() 
    AND it.used_at IS NULL
    AND ir.status = 'approved'
  ORDER BY it.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tokens expiring soon (for warning notifications)
CREATE OR REPLACE FUNCTION get_expiring_invitation_tokens(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE(
  token_id UUID,
  invitation_request_id UUID,
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  parent_name TEXT,
  parent_email TEXT,
  child_name TEXT,
  days_until_expiry INTEGER
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    it.id,
    it.invitation_request_id,
    it.token,
    it.expires_at,
    ir.parent_name,
    ir.parent_email,
    ir.child_name,
    EXTRACT(DAY FROM (it.expires_at - NOW()))::INTEGER as days_until_expiry
  FROM invitation_tokens it
  JOIN invitation_requests ir ON it.invitation_request_id = ir.id
  WHERE it.expires_at > NOW() 
    AND it.expires_at <= NOW() + (days_ahead || ' days')::INTERVAL
    AND it.used_at IS NULL
    AND ir.status = 'approved'
  ORDER BY it.expires_at ASC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive token statistics
CREATE OR REPLACE FUNCTION get_invitation_token_stats()
RETURNS TABLE(
  total_tokens INTEGER,
  active_tokens INTEGER,
  expired_tokens INTEGER,
  used_tokens INTEGER,
  expiring_soon INTEGER
) AS $
DECLARE
  total_count INTEGER;
  active_count INTEGER;
  expired_count INTEGER;
  used_count INTEGER;
  expiring_count INTEGER;
BEGIN
  -- Total tokens
  SELECT COUNT(*) INTO total_count FROM invitation_tokens;
  
  -- Active tokens (not expired, not used)
  SELECT COUNT(*) INTO active_count 
  FROM invitation_tokens 
  WHERE expires_at > NOW() AND used_at IS NULL;
  
  -- Expired tokens (not used)
  SELECT COUNT(*) INTO expired_count 
  FROM invitation_tokens 
  WHERE expires_at <= NOW() AND used_at IS NULL;
  
  -- Used tokens
  SELECT COUNT(*) INTO used_count 
  FROM invitation_tokens 
  WHERE used_at IS NOT NULL;
  
  -- Expiring soon (within 7 days)
  SELECT COUNT(*) INTO expiring_count 
  FROM invitation_tokens 
  WHERE expires_at > NOW() 
    AND expires_at <= NOW() + INTERVAL '7 days'
    AND used_at IS NULL;
  
  RETURN QUERY SELECT total_count, active_count, expired_count, used_count, expiring_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend token expiration (admin functionality)
CREATE OR REPLACE FUNCTION extend_invitation_token_expiry(
  token_input TEXT, 
  additional_days INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $
DECLARE
  token_record RECORD;
BEGIN
  -- Get token record
  SELECT * INTO token_record 
  FROM invitation_tokens 
  WHERE token = token_input AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Extend expiration
  UPDATE invitation_tokens 
  SET expires_at = expires_at + (additional_days || ' days')::INTERVAL
  WHERE token = token_input;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get token usage history for an invitation
CREATE OR REPLACE FUNCTION get_invitation_token_history(invitation_id_input UUID)
RETURNS TABLE(
  token_id UUID,
  token TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  status TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    it.id,
    it.token,
    it.created_at,
    it.expires_at,
    it.used_at,
    CASE 
      WHEN it.used_at IS NOT NULL THEN 'used'
      WHEN it.expires_at <= NOW() THEN 'expired'
      ELSE 'active'
    END as status
  FROM invitation_tokens it
  WHERE it.invitation_request_id = invitation_id_input
  ORDER BY it.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced cleanup function with detailed reporting
CREATE OR REPLACE FUNCTION cleanup_expired_tokens_detailed()
RETURNS TABLE(
  deleted_count INTEGER,
  cleanup_timestamp TIMESTAMP WITH TIME ZONE,
  oldest_deleted_token TIMESTAMP WITH TIME ZONE,
  newest_deleted_token TIMESTAMP WITH TIME ZONE
) AS $
DECLARE
  deleted_count_var INTEGER;
  oldest_token TIMESTAMP WITH TIME ZONE;
  newest_token TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get info about tokens to be deleted
  SELECT MIN(expires_at), MAX(expires_at) 
  INTO oldest_token, newest_token
  FROM invitation_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  -- Delete expired tokens
  DELETE FROM invitation_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  GET DIAGNOSTICS deleted_count_var = ROW_COUNT;
  
  RETURN QUERY SELECT deleted_count_var, NOW(), oldest_token, newest_token;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate token with comprehensive information
CREATE OR REPLACE FUNCTION validate_invitation_token_detailed(token_input TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  validation_status TEXT,
  invitation_id UUID,
  parent_email TEXT,
  child_name TEXT,
  child_age INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  invitation_status TEXT,
  days_until_expiry INTEGER
) AS $
DECLARE
  token_record RECORD;
  invitation_record RECORD;
  validation_status_var TEXT;
  is_valid_var BOOLEAN;
BEGIN
  -- Get token record
  SELECT * INTO token_record 
  FROM invitation_tokens 
  WHERE token = token_input;
  
  IF NOT FOUND THEN
    validation_status_var := 'token_not_found';
    is_valid_var := FALSE;
  ELSE
    -- Get invitation record
    SELECT * INTO invitation_record 
    FROM invitation_requests 
    WHERE id = token_record.invitation_request_id;
    
    -- Determine validation status
    IF token_record.used_at IS NOT NULL THEN
      validation_status_var := 'token_already_used';
      is_valid_var := FALSE;
    ELSIF token_record.expires_at <= NOW() THEN
      validation_status_var := 'token_expired';
      is_valid_var := FALSE;
    ELSIF invitation_record.status != 'approved' THEN
      validation_status_var := 'invitation_not_approved';
      is_valid_var := FALSE;
    ELSE
      validation_status_var := 'valid';
      is_valid_var := TRUE;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    is_valid_var,
    validation_status_var,
    COALESCE(invitation_record.id, NULL::UUID),
    COALESCE(invitation_record.parent_email, NULL::TEXT),
    COALESCE(invitation_record.child_name, NULL::TEXT),
    COALESCE(invitation_record.child_age, NULL::INTEGER),
    COALESCE(token_record.expires_at, NULL::TIMESTAMP WITH TIME ZONE),
    COALESCE(token_record.used_at, NULL::TIMESTAMP WITH TIME ZONE),
    COALESCE(invitation_record.status, NULL::TEXT),
    CASE 
      WHEN token_record.expires_at IS NOT NULL AND token_record.expires_at > NOW() 
      THEN EXTRACT(DAY FROM (token_record.expires_at - NOW()))::INTEGER
      ELSE NULL::INTEGER
    END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION regenerate_invitation_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_token_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_invitation_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_invitation_tokens(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_token_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION extend_invitation_token_expiry(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_token_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens_detailed() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token_detailed(TEXT) TO authenticated;

-- Create a view for admin dashboard token overview
CREATE OR REPLACE VIEW admin_token_overview AS
SELECT 
  it.id as token_id,
  it.token,
  it.created_at,
  it.expires_at,
  it.used_at,
  ir.id as invitation_id,
  ir.parent_name,
  ir.parent_email,
  ir.child_name,
  ir.child_age,
  ir.status as invitation_status,
  ir.created_at as invitation_created_at,
  ir.invitation_claimed_at,
  CASE 
    WHEN it.used_at IS NOT NULL THEN 'used'
    WHEN it.expires_at <= NOW() THEN 'expired'
    WHEN it.expires_at <= NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'active'
  END as token_status,
  EXTRACT(DAY FROM (it.expires_at - NOW()))::INTEGER as days_until_expiry
FROM invitation_tokens it
JOIN invitation_requests ir ON it.invitation_request_id = ir.id
ORDER BY it.created_at DESC;

-- Grant access to the view
GRANT SELECT ON admin_token_overview TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Admin can view token overview" ON admin_token_overview
  FOR SELECT USING (is_admin());

-- Create a trigger to automatically clean up very old expired tokens (older than 90 days)
CREATE OR REPLACE FUNCTION auto_cleanup_old_expired_tokens()
RETURNS TRIGGER AS $
BEGIN
  -- Clean up tokens that expired more than 90 days ago
  DELETE FROM invitation_tokens 
  WHERE expires_at < NOW() - INTERVAL '90 days' 
    AND used_at IS NULL;
  
  RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Create a trigger that runs daily to clean up old tokens
-- Note: This would typically be handled by a cron job in production
-- but we'll create the function for manual execution
CREATE OR REPLACE FUNCTION schedule_token_cleanup()
RETURNS VOID AS $
BEGIN
  -- This function can be called by a scheduled job
  PERFORM auto_cleanup_old_expired_tokens();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION schedule_token_cleanup() TO authenticated;

-- Add helpful comments to the functions
COMMENT ON FUNCTION regenerate_invitation_token(UUID) IS 'Regenerates a new token for an invitation, invalidating any existing unused tokens';
COMMENT ON FUNCTION get_invitation_token_info(UUID) IS 'Gets the current token information for a specific invitation';
COMMENT ON FUNCTION get_active_invitation_tokens() IS 'Returns all active (unused, non-expired) tokens with invitation details';
COMMENT ON FUNCTION get_expiring_invitation_tokens(INTEGER) IS 'Returns tokens that will expire within the specified number of days';
COMMENT ON FUNCTION get_invitation_token_stats() IS 'Returns comprehensive statistics about invitation tokens';
COMMENT ON FUNCTION extend_invitation_token_expiry(TEXT, INTEGER) IS 'Extends the expiration date of a token by the specified number of days';
COMMENT ON FUNCTION get_invitation_token_history(UUID) IS 'Returns the complete token history for an invitation';
COMMENT ON FUNCTION cleanup_expired_tokens_detailed() IS 'Cleans up expired tokens and returns detailed information about the cleanup';
COMMENT ON FUNCTION validate_invitation_token_detailed(TEXT) IS 'Validates a token and returns comprehensive validation information';
COMMENT ON FUNCTION schedule_token_cleanup() IS 'Scheduled function to clean up very old expired tokens (90+ days old)';