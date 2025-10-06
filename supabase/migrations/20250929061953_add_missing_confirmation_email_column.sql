-- Add missing confirmation_email_sent_at column to invitation_requests table
-- This column is referenced by email system functions but may not exist in all environments

ALTER TABLE invitation_requests 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_invitation_requests_confirmation_email_sent_at 
ON invitation_requests(confirmation_email_sent_at);

-- Add comment
COMMENT ON COLUMN invitation_requests.confirmation_email_sent_at IS 'Timestamp when confirmation email was sent to parent';
