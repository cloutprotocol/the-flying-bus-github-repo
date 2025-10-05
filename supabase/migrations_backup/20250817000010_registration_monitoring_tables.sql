-- Registration monitoring and logging tables

-- Table for tracking all registration attempts
CREATE TABLE IF NOT EXISTS registration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('standard', 'invitation')),
  email TEXT NOT NULL,
  attempt_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_type TEXT,
  error_message TEXT,
  completion_time_ms INTEGER,
  rls_bypass_used BOOLEAN DEFAULT FALSE,
  service_role_used BOOLEAN DEFAULT FALSE,
  invitation_token TEXT,
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking RLS policy violations
CREATE TABLE IF NOT EXISTS rls_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  violation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking service role usage
CREATE TABLE IF NOT EXISTS service_role_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  context TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_attempts_timestamp ON registration_attempts(attempt_timestamp);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_type ON registration_attempts(registration_type);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_success ON registration_attempts(success);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email ON registration_attempts(email);

CREATE INDEX IF NOT EXISTS idx_rls_violations_timestamp ON rls_violations(violation_timestamp);
CREATE INDEX IF NOT EXISTS idx_rls_violations_context ON rls_violations(context);
CREATE INDEX IF NOT EXISTS idx_rls_violations_resolved ON rls_violations(resolved);

CREATE INDEX IF NOT EXISTS idx_service_role_usage_timestamp ON service_role_usage(usage_timestamp);
CREATE INDEX IF NOT EXISTS idx_service_role_usage_operation ON service_role_usage(operation);
CREATE INDEX IF NOT EXISTS idx_service_role_usage_context ON service_role_usage(context);

-- RLS policies for monitoring tables
ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_role_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all monitoring data
CREATE POLICY "Service role can manage registration attempts" ON registration_attempts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage RLS violations" ON rls_violations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage service role usage" ON service_role_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to view their own registration attempts
CREATE POLICY "Users can view own registration attempts" ON registration_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Admin users can view all monitoring data
CREATE POLICY "Admins can view all registration attempts" ON registration_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_name = 'admin'
    )
  );

CREATE POLICY "Admins can view all RLS violations" ON rls_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_name = 'admin'
    )
  );

CREATE POLICY "Admins can view all service role usage" ON service_role_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_name = 'admin'
    )
  );

-- Function to get registration metrics
CREATE OR REPLACE FUNCTION get_registration_metrics(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_attempts', COUNT(*),
    'successful_registrations', COUNT(*) FILTER (WHERE success = true),
    'failed_registrations', COUNT(*) FILTER (WHERE success = false),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
    ),
    'average_completion_time_ms', ROUND(AVG(completion_time_ms)),
    'rls_violations', COUNT(*) FILTER (WHERE rls_bypass_used = true),
    'service_role_usage', COUNT(*) FILTER (WHERE service_role_used = true),
    'by_type', json_build_object(
      'standard', json_build_object(
        'attempts', COUNT(*) FILTER (WHERE registration_type = 'standard'),
        'success_rate', ROUND(
          (COUNT(*) FILTER (WHERE registration_type = 'standard' AND success = true)::DECIMAL / 
           NULLIF(COUNT(*) FILTER (WHERE registration_type = 'standard'), 0)) * 100, 2
        ),
        'avg_completion_time', ROUND(AVG(completion_time_ms) FILTER (WHERE registration_type = 'standard'))
      ),
      'invitation', json_build_object(
        'attempts', COUNT(*) FILTER (WHERE registration_type = 'invitation'),
        'success_rate', ROUND(
          (COUNT(*) FILTER (WHERE registration_type = 'invitation' AND success = true)::DECIMAL / 
           NULLIF(COUNT(*) FILTER (WHERE registration_type = 'invitation'), 0)) * 100, 2
        ),
        'avg_completion_time', ROUND(AVG(completion_time_ms) FILTER (WHERE registration_type = 'invitation'))
      )
    ),
    'error_breakdown', (
      SELECT json_object_agg(error_type, error_count)
      FROM (
        SELECT error_type, COUNT(*) as error_count
        FROM registration_attempts
        WHERE attempt_timestamp BETWEEN start_date AND end_date
        AND success = false
        AND error_type IS NOT NULL
        GROUP BY error_type
      ) error_stats
    )
  )
  INTO result
  FROM registration_attempts
  WHERE attempt_timestamp BETWEEN start_date AND end_date;

  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Function to get current success rate
CREATE OR REPLACE FUNCTION get_current_success_rate(hours_back INTEGER DEFAULT 24)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success_rate DECIMAL;
BEGIN
  SELECT ROUND(
    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2
  )
  INTO success_rate
  FROM registration_attempts
  WHERE attempt_timestamp >= NOW() - (hours_back || ' hours')::INTERVAL;

  RETURN COALESCE(success_rate, 0);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_registration_metrics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_current_success_rate TO authenticated, service_role;