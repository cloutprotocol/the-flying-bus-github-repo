-- Create rate_limit_attempts table for tracking rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  identifier text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_action_identifier 
ON rate_limit_attempts(action, identifier);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_created_at 
ON rate_limit_attempts(created_at);

-- Enable RLS
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow service role access
CREATE POLICY "Service role can manage rate limit attempts" ON rate_limit_attempts
FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policy to allow authenticated users to read their own attempts
CREATE POLICY "Users can read their own rate limit attempts" ON rate_limit_attempts
FOR SELECT USING (auth.uid()::text = identifier OR auth.role() = 'service_role');
