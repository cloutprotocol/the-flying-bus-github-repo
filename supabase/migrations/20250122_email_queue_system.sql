-- Email Queue System Migration
-- This migration creates the email_queue table for background email processing

-- Create email queue table
CREATE TABLE email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  email_type email_type NOT NULL,
  recipient_email TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);
CREATE INDEX idx_email_queue_invitation_id ON email_queue(invitation_id);
CREATE INDEX idx_email_queue_status_scheduled ON email_queue(status, scheduled_at) WHERE status IN ('pending', 'retry');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Enable RLS on email_queue table
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for email_queue
CREATE POLICY "Admin can manage email queue" ON email_queue
  FOR ALL USING (is_admin());

-- Create function to clean up old completed jobs (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_old_email_jobs(older_than_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_queue 
  WHERE status = 'completed' 
    AND processed_at < NOW() - (older_than_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get queue statistics
CREATE OR REPLACE FUNCTION get_email_queue_stats()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'retrying', COUNT(*) FILTER (WHERE status = 'retry'),
    'total_jobs', COUNT(*)
  ) INTO stats
  FROM email_queue;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle stuck processing jobs (jobs that have been processing too long)
CREATE OR REPLACE FUNCTION reset_stuck_email_jobs(timeout_minutes INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE email_queue 
  SET status = 'retry',
      error_message = 'Job was stuck in processing state and has been reset for retry',
      updated_at = NOW()
  WHERE status = 'processing' 
    AND updated_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the table
COMMENT ON TABLE email_queue IS 'Queue system for background email processing with retry logic and monitoring';