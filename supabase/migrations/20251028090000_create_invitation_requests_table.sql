-- Migration: create_invitation_requests_table.sql
-- Purpose: Add missing invitation_requests table so triggers and email policies can apply correctly

CREATE TABLE IF NOT EXISTS public.invitation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  child_name text NOT NULL,
  child_age integer NOT NULL,
  message text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid,
  child_user_id uuid,
  confirmation_email_sent_at timestamptz,
  invitation_email_sent_at timestamptz
);

-- Optional indexes for performance (safe to include)
CREATE INDEX IF NOT EXISTS idx_invitation_requests_status
  ON public.invitation_requests (status);

CREATE INDEX IF NOT EXISTS idx_invitation_requests_created_at
  ON public.invitation_requests (created_at);
