-- Create registration_contexts table for tracking registration processes
CREATE TABLE IF NOT EXISTS registration_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('standard', 'invitation')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_contexts_user_id ON registration_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_registration_contexts_type ON registration_contexts(registration_type);
CREATE INDEX IF NOT EXISTS idx_registration_contexts_created_at ON registration_contexts(created_at);
CREATE INDEX IF NOT EXISTS idx_registration_contexts_completed_at ON registration_contexts(completed_at);

-- Enable RLS on registration_contexts
ALTER TABLE registration_contexts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for registration_contexts
-- Service role can manage all registration contexts
CREATE POLICY "Service role can manage registration contexts" ON registration_contexts
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own registration contexts
CREATE POLICY "Users can view own registration contexts" ON registration_contexts
  FOR SELECT USING (
    auth.uid()::text = user_id::text OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'moderator')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON registration_contexts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON registration_contexts TO service_role;

-- Add comments
COMMENT ON TABLE registration_contexts IS 'Tracks registration processes for audit and debugging purposes';
COMMENT ON COLUMN registration_contexts.user_id IS 'ID of the user being registered';
COMMENT ON COLUMN registration_contexts.registration_type IS 'Type of registration: standard or invitation';
COMMENT ON COLUMN registration_contexts.completed_at IS 'Timestamp when registration was completed successfully';
COMMENT ON COLUMN registration_contexts.metadata IS 'Additional context and debugging information';