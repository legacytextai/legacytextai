-- Fix the last function search path
CREATE OR REPLACE FUNCTION public.is_otp_active(expires_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
  SELECT expires_at > now();
$$;