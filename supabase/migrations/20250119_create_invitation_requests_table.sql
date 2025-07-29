-- Create invitation_requests table
-- This table stores parent requests for child account invitations

CREATE TABLE IF NOT EXISTS invitation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  child_name TEXT NOT NULL,
  child_age INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  child_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance (only the ones not created by later migrations)
CREATE INDEX IF NOT EXISTS idx_invitation_requests_parent_email ON invitation_requests(parent_email);
CREATE INDEX IF NOT EXISTS idx_invitation_requests_child_user_id ON invitation_requests(child_user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_requests_reviewer_id ON invitation_requests(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_invitation_requests_created_at ON invitation_requests(created_at);

-- Enable Row Level Security
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Parents can view their own requests
CREATE POLICY "Parents can view their own invitation requests" ON invitation_requests
  FOR SELECT USING (parent_email = auth.jwt() ->> 'email');

-- Parents can insert their own requests
CREATE POLICY "Parents can create invitation requests" ON invitation_requests
  FOR INSERT WITH CHECK (parent_email = auth.jwt() ->> 'email');

-- Admins can view all requests (assuming is_admin() function exists)
CREATE POLICY "Admins can view all invitation requests" ON invitation_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update all requests
CREATE POLICY "Admins can update invitation requests" ON invitation_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON invitation_requests TO authenticated;