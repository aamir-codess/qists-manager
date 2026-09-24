CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_time ON public.login_attempts (lower(email), created_at DESC);
GRANT SELECT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see their own login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));