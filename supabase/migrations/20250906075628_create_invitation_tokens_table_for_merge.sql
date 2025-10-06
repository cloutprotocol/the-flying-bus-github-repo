-- Create invitation_tokens table on production to support merge
-- This table is needed by migration 20250824025933_author_role_assignment_trigger.sql

CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    invitation_request_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the index that the migration expects
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_used_by_lookup 
ON invitation_tokens (used_by, used_at) 
WHERE used_by IS NOT NULL AND used_at IS NOT NULL;

-- Create other useful indexes
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token_hash ON invitation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires_at ON invitation_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_invitation_request_id ON invitation_tokens(invitation_request_id);

-- Enable RLS
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage invitation tokens" ON invitation_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own invitation tokens" ON invitation_tokens
  FOR SELECT USING (email = auth.email() OR used_by = auth.uid());

-- Grant permissions
GRANT ALL ON invitation_tokens TO service_role;
GRANT SELECT ON invitation_tokens TO authenticated;

-- Add foreign key constraint if invitation_requests table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitation_requests') THEN
        ALTER TABLE invitation_tokens 
        ADD CONSTRAINT fk_invitation_tokens_invitation_request_id 
        FOREIGN KEY (invitation_request_id) REFERENCES invitation_requests(id);
        
        RAISE NOTICE 'Added foreign key constraint to invitation_requests';
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE invitation_tokens IS 'Stores invitation tokens for user registration system';

-- Test insert
INSERT INTO invitation_tokens (token_hash, email, expires_at, metadata) VALUES 
  ('test_hash_' || gen_random_uuid()::text, 'test@example.com', NOW() + INTERVAL '7 days', jsonb_build_object(
    'migration', 'create_invitation_tokens_table_for_merge',
    'description', 'Created invitation_tokens table to support merge process',
    'timestamp', NOW()
  ));

-- Verify table was created
SELECT COUNT(*) as invitation_tokens_count FROM invitation_tokens;