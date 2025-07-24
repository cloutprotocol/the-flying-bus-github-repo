-- Safe Migration for Invitation Approval Workflow
-- This migration safely adds the necessary tables and triggers, checking for existing objects

-- Create email_type enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE email_type AS ENUM ('approval', 'denial', 'welcome', 'expiry_warning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create delivery_status enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed', 'bounced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create invitation_tokens table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_request_id UUID NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_notifications table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_request_id UUID NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  email_type email_type NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status delivery_status DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to invitation_requests table (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE invitation_requests ADD COLUMN invitation_claimed_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE invitation_requests ADD COLUMN notification_sent_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE invitation_requests ADD COLUMN notification_status TEXT DEFAULT 'pending';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_invitation_id ON invitation_tokens(invitation_request_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires_at ON invitation_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_invitation_id ON email_notifications(invitation_request_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_delivery_status ON email_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_invitation_requests_status ON invitation_requests(status);
CREATE INDEX IF NOT EXISTS idx_invitation_requests_notification_status ON invitation_requests(notification_status);

-- Create function to automatically generate tokens on approval
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate token when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO invitation_tokens (invitation_request_id, token, expires_at)
    VALUES (
      NEW.id,
      encode(gen_random_bytes(32), 'base64url'),
      NOW() + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate tokens (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_generate_invitation_token ON invitation_requests;
CREATE TRIGGER trigger_generate_invitation_token
  AFTER UPDATE ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_invitation_token();

-- Create function to clean up expired tokens (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invitation_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- Enable Row Level Security on new tables
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Admin can manage invitation tokens" ON invitation_tokens;
CREATE POLICY "Admin can manage invitation tokens" ON invitation_tokens
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Users can view their own invitation tokens" ON invitation_tokens;
CREATE POLICY "Users can view their own invitation tokens" ON invitation_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invitation_requests ir 
      WHERE ir.id = invitation_tokens.invitation_request_id 
      AND ir.parent_email = auth.jwt() ->> 'email'
    )
  );

-- Create policies for email_notifications  
DROP POLICY IF EXISTS "Admin can view email notifications" ON email_notifications;
CREATE POLICY "Admin can view email notifications" ON email_notifications
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert email notifications" ON email_notifications;
CREATE POLICY "Admin can insert email notifications" ON email_notifications
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update email notifications" ON email_notifications;
CREATE POLICY "Admin can update email notifications" ON email_notifications
  FOR UPDATE USING (is_admin());

-- Create function to validate invitation tokens
CREATE OR REPLACE FUNCTION validate_invitation_token(token_input TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  invitation_id UUID,
  parent_email TEXT,
  child_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    (it.expires_at > NOW() AND it.used_at IS NULL) as is_valid,
    ir.id as invitation_id,
    ir.parent_email,
    ir.child_name,
    it.expires_at,
    it.used_at
  FROM invitation_tokens it
  JOIN invitation_requests ir ON it.invitation_request_id = ir.id
  WHERE it.token = token_input;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark token as used
CREATE OR REPLACE FUNCTION use_invitation_token(token_input TEXT, user_id_input UUID)
RETURNS BOOLEAN AS $
DECLARE
  token_record RECORD;
  invitation_record RECORD;
BEGIN
  -- Get token and validate it
  SELECT * INTO token_record 
  FROM invitation_tokens 
  WHERE token = token_input AND expires_at > NOW() AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get invitation record
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = token_record.invitation_request_id;
  
  -- Mark token as used
  UPDATE invitation_tokens 
  SET used_at = NOW() 
  WHERE token = token_input;
  
  -- Update invitation request with user link and claim timestamp
  UPDATE invitation_requests 
  SET 
    child_user_id = user_id_input,
    invitation_claimed_at = NOW()
  WHERE id = token_record.invitation_request_id;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON invitation_tokens TO authenticated;
GRANT ALL ON email_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION use_invitation_token(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO authenticated;