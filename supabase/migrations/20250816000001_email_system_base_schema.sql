-- Email System Base Schema Migration
-- This migration creates all the foundational tables and columns needed for the email notification system
-- It must be applied BEFORE the other email system migrations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create invitation_tokens table for managing invitation tokens
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    invitation_request_id UUID REFERENCES invitation_requests(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for invitation_tokens
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_hash ON invitation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires_at ON invitation_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_used_at ON invitation_tokens(used_at);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_request_id ON invitation_tokens(invitation_request_id);

-- Create email_events table for tracking email delivery
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed'
    email TEXT NOT NULL,
    template TEXT NOT NULL,
    message_id TEXT,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email_events
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(type);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_template ON email_events(template);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_message_id ON email_events(message_id);

-- Add missing columns to invitation_requests table
-- These columns are needed for tracking email sending status
ALTER TABLE invitation_requests 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_invitation_requests_confirmation_sent ON invitation_requests(confirmation_email_sent_at);
CREATE INDEX IF NOT EXISTS idx_invitation_requests_invitation_sent ON invitation_requests(invitation_email_sent_at);

-- Add triggers for updated_at timestamps on new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: invitation_requests already has this trigger from the main schema

-- Insert sample data for testing the email system
-- Sample invitation tokens for testing
INSERT INTO invitation_tokens (id, token_hash, email, invitation_request_id, expires_at, metadata) 
SELECT 
    gen_random_uuid(),
    'sample_token_hash_' || generate_random_uuid()::text,
    ir.parent_email,
    ir.id,
    NOW() + INTERVAL '7 days',
    jsonb_build_object(
        'created_by', 'migration',
        'test_token', true,
        'parent_name', ir.parent_name,
        'child_name', ir.child_name
    )
FROM invitation_requests ir
WHERE ir.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM invitation_tokens it 
    WHERE it.invitation_request_id = ir.id
)
LIMIT 3
ON CONFLICT (token_hash) DO NOTHING;

-- Sample email events for testing
INSERT INTO email_events (type, email, template, message_id, metadata) VALUES
    ('sent', 'test@example.com', 'invitation_confirmation', 'msg_test_001', jsonb_build_object('test', true, 'created_by', 'migration')),
    ('delivered', 'test@example.com', 'invitation_confirmation', 'msg_test_001', jsonb_build_object('test', true, 'created_by', 'migration')),
    ('sent', 'admin@theflyingbus.org', 'invitation_approved', 'msg_test_002', jsonb_build_object('test', true, 'created_by', 'migration'))
ON CONFLICT DO NOTHING;

-- Create helper function to generate secure token hashes
CREATE OR REPLACE FUNCTION generate_invitation_token_hash()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token hash
    -- This uses a combination of random UUID and timestamp for uniqueness
    RETURN encode(
        digest(
            generate_random_uuid()::text || 
            extract(epoch from now())::text || 
            random()::text, 
            'sha256'
        ), 
        'hex'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to create invitation tokens
CREATE OR REPLACE FUNCTION create_invitation_token(
    p_email TEXT,
    p_invitation_request_id UUID,
    p_expires_hours INTEGER DEFAULT 168 -- 7 days default
)
RETURNS UUID AS $$
DECLARE
    v_token_id UUID;
    v_token_hash TEXT;
BEGIN
    -- Generate unique token hash
    v_token_hash := generate_invitation_token_hash();
    
    -- Ensure uniqueness (retry if collision)
    WHILE EXISTS (SELECT 1 FROM invitation_tokens WHERE token_hash = v_token_hash) LOOP
        v_token_hash := generate_invitation_token_hash();
    END LOOP;
    
    -- Insert the token
    INSERT INTO invitation_tokens (
        token_hash,
        email,
        invitation_request_id,
        expires_at,
        metadata
    ) VALUES (
        v_token_hash,
        p_email,
        p_invitation_request_id,
        NOW() + (p_expires_hours || ' hours')::INTERVAL,
        jsonb_build_object(
            'created_at', NOW(),
            'expires_hours', p_expires_hours
        )
    ) RETURNING id INTO v_token_id;
    
    RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to validate and use invitation tokens
CREATE OR REPLACE FUNCTION use_invitation_token(
    p_token_hash TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_token_record invitation_tokens%ROWTYPE;
    v_result JSON;
BEGIN
    -- Get the token
    SELECT * INTO v_token_record
    FROM invitation_tokens
    WHERE token_hash = p_token_hash;
    
    -- Check if token exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'invalid_token',
            'message', 'Token not found'
        );
    END IF;
    
    -- Check if token is already used
    IF v_token_record.used_at IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'token_used',
            'message', 'Token has already been used',
            'used_at', v_token_record.used_at
        );
    END IF;
    
    -- Check if token is expired
    IF v_token_record.expires_at < NOW() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'token_expired',
            'message', 'Token has expired',
            'expired_at', v_token_record.expires_at
        );
    END IF;
    
    -- Mark token as used
    UPDATE invitation_tokens
    SET 
        used_at = NOW(),
        used_by = p_user_id,
        metadata = metadata || jsonb_build_object(
            'used_at', NOW(),
            'used_by', p_user_id
        )
    WHERE id = v_token_record.id;
    
    -- Return success with token details
    RETURN json_build_object(
        'success', true,
        'message', 'Token successfully used',
        'token_id', v_token_record.id,
        'invitation_request_id', v_token_record.invitation_request_id,
        'email', v_token_record.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log email events
CREATE OR REPLACE FUNCTION log_email_event(
    p_type TEXT,
    p_email TEXT,
    p_template TEXT,
    p_message_id TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO email_events (
        type,
        email,
        template,
        message_id,
        error,
        metadata
    ) VALUES (
        p_type,
        p_email,
        p_template,
        p_message_id,
        p_error,
        p_metadata || jsonb_build_object('logged_at', NOW())
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for the new tables and functions
GRANT SELECT, INSERT, UPDATE, DELETE ON invitation_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invitation_tokens TO service_role;

GRANT SELECT, INSERT ON email_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_events TO service_role;

GRANT EXECUTE ON FUNCTION generate_invitation_token_hash() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token_hash() TO service_role;

GRANT EXECUTE ON FUNCTION create_invitation_token(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation_token(TEXT, UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION use_invitation_token(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION use_invitation_token(TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- Add comments for documentation
COMMENT ON TABLE invitation_tokens IS 'Stores secure tokens for invitation activation links';
COMMENT ON TABLE email_events IS 'Tracks all email delivery events and status updates';
COMMENT ON COLUMN invitation_requests.confirmation_email_sent_at IS 'Timestamp when confirmation email was sent to parent';
COMMENT ON COLUMN invitation_requests.invitation_email_sent_at IS 'Timestamp when invitation email was sent to parent';

COMMENT ON FUNCTION generate_invitation_token_hash() IS 'Generates a secure, unique token hash for invitation links';
COMMENT ON FUNCTION create_invitation_token(TEXT, UUID, INTEGER) IS 'Creates a new invitation token with specified expiration';
COMMENT ON FUNCTION use_invitation_token(TEXT, UUID) IS 'Validates and marks an invitation token as used';
COMMENT ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Logs email delivery events for monitoring and debugging';

-- Create a view for active invitation tokens (not expired, not used)
CREATE OR REPLACE VIEW active_invitation_tokens AS
SELECT 
    it.*,
    ir.parent_name,
    ir.child_name,
    ir.status as invitation_status,
    EXTRACT(EPOCH FROM (it.expires_at - NOW())) / 3600 as hours_until_expiry
FROM invitation_tokens it
JOIN invitation_requests ir ON it.invitation_request_id = ir.id
WHERE it.used_at IS NULL 
AND it.expires_at > NOW()
ORDER BY it.created_at DESC;

GRANT SELECT ON active_invitation_tokens TO authenticated;
GRANT SELECT ON active_invitation_tokens TO service_role;

COMMENT ON VIEW active_invitation_tokens IS 'View of all active (unused, non-expired) invitation tokens with related invitation details';
