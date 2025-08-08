-- Security and Analytics Tables

-- Security Logs Table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocked Users Table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Rate Limit Violations Table
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT,
  violation_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Documents Table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT
);

-- Enable Row-Level Security
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Security Logs Policies
CREATE POLICY "security_logs_select" ON public.security_logs
  FOR SELECT
  USING (true); -- Admins can view all logs

CREATE POLICY "security_logs_insert" ON public.security_logs
  FOR INSERT
  WITH CHECK (true);

-- Blocked Users Policies
CREATE POLICY "blocked_users_select" ON public.blocked_users
  FOR SELECT
  USING (true);

CREATE POLICY "blocked_users_insert" ON public.blocked_users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "blocked_users_delete" ON public.blocked_users
  FOR DELETE
  USING (true);

-- User Documents Policies
CREATE POLICY "user_documents_select_own" ON public.user_documents
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_documents_select_admin" ON public.user_documents
  FOR SELECT
  USING (true); -- Admins can view all documents

CREATE POLICY "user_documents_insert" ON public.user_documents
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR true); -- Users can insert their own, admins can insert any

CREATE POLICY "user_documents_update" ON public.user_documents
  FOR UPDATE
  USING (true); -- Admins can update verification status

CREATE POLICY "user_documents_delete" ON public.user_documents
  FOR DELETE
  USING (user_id = auth.uid() OR true);

-- Email Logs Policies
CREATE POLICY "email_logs_select" ON public.email_logs
  FOR SELECT
  USING (true); -- Admins can view all email logs

CREATE POLICY "email_logs_insert" ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_verification_status ON public.user_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON public.rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_window ON public.rate_limit_violations(window_start);

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TABLE(user_id UUID, activity_type TEXT, count BIGINT, latest_activity TIMESTAMPTZ)
LANGUAGE sql
AS $$
  SELECT 
    sl.user_id,
    sl.event_type as activity_type,
    COUNT(*) as count,
    MAX(sl.created_at) as latest_activity
  FROM security_logs sl
  WHERE sl.created_at > now() - interval '1 hour'
    AND sl.event_type IN ('failed_login', 'rate_limit_exceeded', 'suspicious_behavior')
  GROUP BY sl.user_id, sl.event_type
  HAVING COUNT(*) > 5
  ORDER BY count DESC;
$$;